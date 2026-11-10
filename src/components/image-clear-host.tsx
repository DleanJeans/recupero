import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { CLEAR_TIMEOUT_MS, type ClearJob, hasClearJobs, subscribeClearJobs, takeClearJob } from '../utils/image-clear';
import { CLEAR_PAGE_HTML } from '../utils/image-clear-script';

const SOURCE = { html: CLEAR_PAGE_HTML };

/** An invisible browser that does the pixel work for "replace the picture's background". It is only created once the
 *  first picture needs it, and handles one picture at a time. Mount it once near the app root. */
export function ImageClearHost() {
  const [active, setActive] = useState(false);
  const webView = useRef<WebView>(null);
  const pageReady = useRef(false);
  const current = useRef<{ job: ClearJob; timer: ReturnType<typeof setTimeout> } | null>(null);

  const finish = useCallback((png: string | null) => {
    const running = current.current;
    if (!running) return;
    clearTimeout(running.timer);
    current.current = null;
    running.job.resolve(png);
  }, []);

  const pump = useCallback(() => {
    if (!pageReady.current || current.current) return;
    const job = takeClearJob();
    if (!job) return;
    const timer = setTimeout(() => {
      finish(null);
      pump();
    }, CLEAR_TIMEOUT_MS);
    current.current = { job, timer };
    webView.current?.postMessage(
      JSON.stringify({ id: job.id, base64: job.base64, tolerance: job.tolerance, fill: job.fill }),
    );
  }, [finish]);

  useEffect(() => {
    if (hasClearJobs()) setActive(true);
    return subscribeClearJobs(() => {
      setActive(true);
      pump();
    });
  }, [pump]);

  const onMessage = (event: WebViewMessageEvent) => {
    let message: { ready?: boolean; id?: number; png?: string; error?: string };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message.ready) {
      pageReady.current = true;
      pump();
      return;
    }
    if (current.current && message.id === current.current.job.id) {
      finish(message.png ?? null);
      pump();
    }
  };

  if (!active) return null;
  return (
    <View
      pointerEvents="none"
      style={styles.hidden}
    >
      <WebView
        ref={webView}
        source={SOURCE}
        originWhitelist={['*']}
        javaScriptEnabled
        onMessage={onMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0 },
});
