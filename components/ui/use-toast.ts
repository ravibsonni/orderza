"use client";
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 4000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

let count = 0;
function genId() { return `toast-${++count}`; }

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

type State = { toasts: ToasterToast[] };
type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return { toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "UPDATE_TOAST":
      return { toasts: state.toasts.map((t) => t.id === action.toast.id ? { ...t, ...action.toast } : t) };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        const timeout = setTimeout(() => dispatch({ type: "REMOVE_TOAST", toastId }), TOAST_REMOVE_DELAY);
        toastTimeouts.set(toastId, timeout);
      } else {
        state.toasts.forEach((t) => {
          const timeout = setTimeout(() => dispatch({ type: "REMOVE_TOAST", toastId: t.id }), TOAST_REMOVE_DELAY);
          toastTimeouts.set(t.id, timeout);
        });
      }
      return { toasts: state.toasts.map((t) => (!toastId || t.id === toastId) ? { ...t, open: false } : t) };
    }
    case "REMOVE_TOAST":
      return { toasts: action.toastId ? state.toasts.filter((t) => t.id !== action.toastId) : [] };
  }
}

function toast(props: Omit<ToasterToast, "id">) {
  const id = genId();
  const update = (p: Partial<ToasterToast>) => dispatch({ type: "UPDATE_TOAST", toast: { ...p, id } });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });
  dispatch({ type: "ADD_TOAST", toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dismiss(); } } });
  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => { const i = listeners.indexOf(setState); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return { ...state, toast, dismiss: (id?: string) => dispatch({ type: "DISMISS_TOAST", toastId: id }) };
}

export { useToast, toast };
