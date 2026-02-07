/**
 * Pensaer BIM Platform - EIR/BEP Store
 *
 * Zustand store for managing EIR templates, BEP documents,
 * and validation state.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  EIRTemplate,
  BEPTemplate,
  EIRValidationReport,
} from "../types/eir";

// ============================================
// STORE INTERFACE
// ============================================

interface EIRState {
  /** Currently loaded EIR template */
  loadedEIR: EIRTemplate | null;
  /** Generated/loaded BEP */
  loadedBEP: BEPTemplate | null;
  /** Latest validation report */
  validationReport: EIRValidationReport | null;
  /** Whether a validation is in progress */
  isValidating: boolean;
  /** Per-element compliance status cache: elementId -> status */
  elementComplianceMap: Record<string, "pass" | "fail" | "warning">;
  /** Per-element compliance messages */
  elementComplianceMessages: Record<string, string[]>;
}

interface EIRActions {
  loadEIR: (eir: EIRTemplate) => void;
  clearEIR: () => void;
  loadBEP: (bep: BEPTemplate) => void;
  clearBEP: () => void;
  setValidationReport: (report: EIRValidationReport) => void;
  setIsValidating: (v: boolean) => void;
  setElementCompliance: (
    elementId: string,
    status: "pass" | "fail" | "warning",
    messages: string[]
  ) => void;
  clearCompliance: () => void;
}

export const useEIRStore = create<EIRState & EIRActions>()(
  immer((set) => ({
    // State
    loadedEIR: null,
    loadedBEP: null,
    validationReport: null,
    isValidating: false,
    elementComplianceMap: {},
    elementComplianceMessages: {},

    // Actions
    loadEIR: (eir) =>
      set((state) => {
        state.loadedEIR = eir;
        // Clear old validation when loading new EIR
        state.validationReport = null;
        state.elementComplianceMap = {};
        state.elementComplianceMessages = {};
      }),

    clearEIR: () =>
      set((state) => {
        state.loadedEIR = null;
        state.validationReport = null;
        state.elementComplianceMap = {};
        state.elementComplianceMessages = {};
      }),

    loadBEP: (bep) =>
      set((state) => {
        state.loadedBEP = bep;
      }),

    clearBEP: () =>
      set((state) => {
        state.loadedBEP = null;
      }),

    setValidationReport: (report) =>
      set((state) => {
        state.validationReport = report;
      }),

    setIsValidating: (v) =>
      set((state) => {
        state.isValidating = v;
      }),

    setElementCompliance: (elementId, status, messages) =>
      set((state) => {
        state.elementComplianceMap[elementId] = status;
        state.elementComplianceMessages[elementId] = messages;
      }),

    clearCompliance: () =>
      set((state) => {
        state.elementComplianceMap = {};
        state.elementComplianceMessages = {};
      }),
  }))
);
