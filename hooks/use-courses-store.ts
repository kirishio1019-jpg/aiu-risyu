"use client"

import { useState, useEffect, useCallback } from "react"
import type { CourseRecord, TrackType } from "@/lib/academic-data"

const STORAGE_KEY_COURSES = "aiu-courses-v4"
const STORAGE_KEY_TRACK = "aiu-major-track-v3"
const STORAGE_KEY_SETUP_DONE = "aiu-setup-done-v3"
const STORAGE_KEY_HOST_INSTITUTION = "aiu-host-institution-v1"

export interface CoursesStore {
  courses: CourseRecord[]
  majorTrack: TrackType
  hostInstitution: string
  isFirstRun: boolean
  isLoaded: boolean
  addCourse: (course: Omit<CourseRecord, "id">) => void
  updateCourse: (id: string, course: Omit<CourseRecord, "id">) => void
  deleteCourse: (id: string) => void
  importCourses: (courses: Omit<CourseRecord, "id">[]) => void
  replaceAllCourses: (courses: Omit<CourseRecord, "id">[]) => void
  setMajorTrack: (track: TrackType) => void
  setHostInstitution: (id: string) => void
  completeSetup: () => void
  clearAll: () => void
}

function generateId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function useCoursesStore(): CoursesStore {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [majorTrack, setMajorTrackState] = useState<TrackType>("Global Business")
  const [hostInstitution, setHostInstitutionState] = useState("")
  const [isFirstRun, setIsFirstRun] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const setupDone = localStorage.getItem(STORAGE_KEY_SETUP_DONE)
      const storedCourses = localStorage.getItem(STORAGE_KEY_COURSES)
      const storedTrack = localStorage.getItem(STORAGE_KEY_TRACK)
      const storedHost = localStorage.getItem(STORAGE_KEY_HOST_INSTITUTION)

      if (setupDone === "true") {
        setIsFirstRun(false)
        let parsed = storedCourses ? JSON.parse(storedCourses) : []
        if (!Array.isArray(parsed) || parsed.length === 0) {
          const v3 = localStorage.getItem(STORAGE_KEY_COURSES_V3)
          if (v3) parsed = JSON.parse(v3)
        }
        const migrated = (Array.isArray(parsed) ? parsed : []).map((c: CourseRecord) => ({
          ...c,
          studyAbroadPhase: c.studyAbroadPhase ?? (c.transferStatus === "approved" || c.transferStatus === "rejected" ? "cml_converted" : "taking"),
        }))
        setCourses(migrated)
      } else {
        setIsFirstRun(true)
        setCourses([])
      }
      if (storedTrack) setMajorTrackState(storedTrack as TrackType)
      if (storedHost) setHostInstitutionState(storedHost)
    } catch {
      setCourses([])
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courses))
  }, [courses, isLoaded])

  useEffect(() => {
    if (!isLoaded) return
    localStorage.setItem(STORAGE_KEY_TRACK, majorTrack)
  }, [majorTrack, isLoaded])

  const addCourse = useCallback((course: Omit<CourseRecord, "id">) => {
    setCourses(prev => [...prev, { ...course, id: generateId() }])
  }, [])

  const updateCourse = useCallback((id: string, course: Omit<CourseRecord, "id">) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...course, id } : c))
  }, [])

  const deleteCourse = useCallback((id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id))
  }, [])

  const importCourses = useCallback((newCourses: Omit<CourseRecord, "id">[]) => {
    const withIds = newCourses.map(c => ({ ...c, id: generateId() }))
    setCourses(prev => [...prev, ...withIds])
  }, [])

  const replaceAllCourses = useCallback((newCourses: Omit<CourseRecord, "id">[]) => {
    const withIds = newCourses.map(c => ({ ...c, id: generateId() }))
    setCourses(withIds)
  }, [])

  const setMajorTrack = useCallback((track: TrackType) => {
    setMajorTrackState(track)
  }, [])

  const setHostInstitution = useCallback((id: string) => {
    setHostInstitutionState(id)
  }, [])

  const completeSetup = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_SETUP_DONE, "true")
    setIsFirstRun(false)
  }, [])

  const clearAll = useCallback(() => {
    setCourses([])
    setMajorTrackState("Global Business")
    setHostInstitutionState("")
    localStorage.removeItem(STORAGE_KEY_SETUP_DONE)
    localStorage.removeItem(STORAGE_KEY_HOST_INSTITUTION)
    setIsFirstRun(true)
  }, [])

  return {
    courses, majorTrack, hostInstitution, isFirstRun, isLoaded,
    addCourse, updateCourse, deleteCourse, importCourses, replaceAllCourses,
    setMajorTrack, setHostInstitution, completeSetup, clearAll,
  }
}
