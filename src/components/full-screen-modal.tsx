import React from 'react';
import { Modal } from 'react-native';
import { ScreenFrame } from './screen-frame';

interface FullScreenModalProps {
  title?: string;
  /** Replaces `title` with custom content (e.g. an icon and a title) beside the back button. */
  headerContent?: React.ReactNode;
  /** Shown at the right end of the top bar, e.g. a settings cog. */
  rightContent?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

/** Full-screen dialog with a back button at the top, for small pickers that stay on their screen. */
export function FullScreenModal({ title, headerContent, rightContent, onClose, children }: FullScreenModalProps) {
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ScreenFrame
        title={title}
        headerContent={headerContent}
        rightContent={rightContent}
        onClose={onClose}
      >
        {children}
      </ScreenFrame>
    </Modal>
  );
}
