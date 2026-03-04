"use client"

import { useState, useEffect, useCallback } from "react"

/** Pre-CML workflow status (Manual: Steps 5-6) */
export type PreCmlStatus =
  | "not_started"           // Pre-CML not yet created
  | "created"               // Step 2 done
  | "shared_with_advisor"   // Step 3 done
  | "under_consultation"     // Step 5: Advisor reviewing, may request modifications
  | "pending_approval"      // Step 6: Awaiting advisor approval
  | "approved_by_advisor"   // Advisor approved
  | "submitted_to_records"  // Advisor submitted to Student Records
  | "original_saved"        // Step 7: User downloaded original

const STORAGE_KEY_PRECML = "aiu-precml-v1"

export interface PreCmlStore {
  /** Current workflow step (1-7) */
  currentStep: number
  /** Overall Pre-CML status */
  status: PreCmlStatus
  /** Link to Pre-CML Google Spreadsheet */
  precmlUrl: string
  /** Whether user has completed each step */
  stepsCompleted: Record<number, boolean>
  setCurrentStep: (step: number) => void
  setStatus: (status: PreCmlStatus) => void
  setPrecmlUrl: (url: string) => void
  markStepComplete: (step: number) => void
  reset: () => void
}

const DEFAULT_STEPS: Record<number, boolean> = {
  1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false,
}

export function usePreCmlStore(): PreCmlStore {
  const [currentStep, setCurrentStepState] = useState(1)
  const [status, setStatusState] = useState<PreCmlStatus>("not_started")
  const [precmlUrl, setPrecmlUrlState] = useState("")
  const [stepsCompleted, setStepsCompletedState] = useState<Record<number, boolean>>(DEFAULT_STEPS)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRECML)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.currentStep != null) setCurrentStepState(data.currentStep)
        if (data.status) setStatusState(data.status)
        if (data.precmlUrl) setPrecmlUrlState(data.precmlUrl)
        if (data.stepsCompleted) setStepsCompletedState({ ...DEFAULT_STEPS, ...data.stepsCompleted })
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRECML, JSON.stringify({
        currentStep,
        status,
        precmlUrl,
        stepsCompleted,
      }))
    } catch {
      // ignore
    }
  }, [currentStep, status, precmlUrl, stepsCompleted])

  const setCurrentStep = useCallback((step: number) => {
    setCurrentStepState(Math.max(1, Math.min(7, step)))
  }, [])

  const setStatus = useCallback((s: PreCmlStatus) => {
    setStatusState(s)
  }, [])

  const setPrecmlUrl = useCallback((url: string) => {
    setPrecmlUrlState(url.trim())
  }, [])

  const markStepComplete = useCallback((step: number) => {
    setStepsCompletedState(prev => ({ ...prev, [step]: true }))
  }, [])

  const reset = useCallback(() => {
    setCurrentStepState(1)
    setStatusState("not_started")
    setPrecmlUrlState("")
    setStepsCompletedState({ ...DEFAULT_STEPS })
    localStorage.removeItem(STORAGE_KEY_PRECML)
  }, [])

  return {
    currentStep,
    status,
    precmlUrl,
    stepsCompleted,
    setCurrentStep,
    setStatus,
    setPrecmlUrl,
    markStepComplete,
    reset,
  }
}
