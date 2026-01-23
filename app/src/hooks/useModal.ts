/**
 * Pensaer BIM Platform - useModal Hook
 *
 * Provides state management for modal dialogs with convenient
 * open/close functions and data passing.
 */

import { useState, useCallback, useMemo } from "react";

/**
 * Basic modal state hook
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
    }),
    [isOpen, open, close, toggle]
  );
}

/**
 * Modal state with associated data
 */
export function useModalWithData<T>(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Clear data after a short delay to allow closing animation
    setTimeout(() => setData(null), 150);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        setTimeout(() => setData(null), 150);
      }
      return !prev;
    });
  }, []);

  return useMemo(
    () => ({
      isOpen,
      data,
      open,
      close,
      toggle,
      setData,
    }),
    [isOpen, data, open, close, toggle]
  );
}

/**
 * Confirm dialog hook with promise resolution
 */
export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    resolve?: (value: boolean) => void;
  }>({
    title: "",
    message: "",
  });

  const confirm = useCallback(
    (options: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      variant?: "danger" | "warning" | "info";
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfig({ ...options, resolve });
        setIsOpen(true);
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    config.resolve?.(true);
    setIsOpen(false);
  }, [config]);

  const handleCancel = useCallback(() => {
    config.resolve?.(false);
    setIsOpen(false);
  }, [config]);

  return useMemo(
    () => ({
      isOpen,
      config,
      confirm,
      handleConfirm,
      handleCancel,
    }),
    [isOpen, config, confirm, handleConfirm, handleCancel]
  );
}

/**
 * Alert dialog hook
 */
export function useAlertModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    buttonText?: string;
    variant?: "error" | "warning" | "info" | "success";
  }>({
    title: "",
    message: "",
  });

  const alert = useCallback(
    (options: {
      title: string;
      message: string;
      buttonText?: string;
      variant?: "error" | "warning" | "info" | "success";
    }) => {
      setConfig(options);
      setIsOpen(true);
    },
    []
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return useMemo(
    () => ({
      isOpen,
      config,
      alert,
      close,
    }),
    [isOpen, config, alert, close]
  );
}

export default useModal;
