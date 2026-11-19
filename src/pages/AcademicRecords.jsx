import { useEffect, useState } from "react";
import { api } from "../services/api";

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const allStudentsOption = "__all_students__";

const withRowKeys = (entries) =>
  entries.map((entry) => ({ ...entry, rowKey: entry._id }));

function AcademicRecords({ students, departments }) {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [timetable, setTimetable] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [bulkExam, setBulkExam] = useState({
    academicYear: "",
    examName: "",
    subject: "",
    maximumMarks: "100",
  });
  const [bulkScores, setBulkScores] = useState({});
  const [timetableImage, setTimetableImage] = useState(null);
  const [loadedDepartmentId, setLoadedDepartmentId] = useState("");
  const [loadedStudentId, setLoadedStudentId] = useState("");
  const [savingTimetable, setSavingTimetable] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [timetableError, setTimetableError] = useState("");
  const [resultsError, setResultsError] = useState("");
  const [timetableMessage, setTimetableMessage] = useState("");
  const [resultsMessage, setResultsMessage] = useState("");

  const departmentId = departments.some((department) => department.id === selectedDepartmentId)
    ? selectedDepartmentId
    : departments[0]?.id || "";
  const selectedDepartment = departments.find((department) => department.id === departmentId);
  const departmentStudents = selectedDepartment
    ? students.filter((student) => student.department === selectedDepartment.name)
    : [];
  const bulkMode = selectedStudentId === allStudentsOption && departmentStudents.length > 0;
  const studentId = !bulkMode && departmentStudents.some((student) => student.id === selectedStudentId)
    ? selectedStudentId
    : !bulkMode ? departmentStudents[0]?.id || "" : "";
  const studentOption = bulkMode ? allStudentsOption : studentId;
  const timetableLoading = Boolean(departmentId) && loadedDepartmentId !== departmentId;
  const resultsLoading = Boolean(studentId) && loadedStudentId !== studentId;

  useEffect(() => {
    let active = true;
    if (!departmentId) return () => { active = false; };

    api.getDepartmentAcademicRecords(departmentId)
      .then((records) => {
        if (!active) return;
        setTimetable(withRowKeys(records.timetable).map((entry) => ({
          ...entry,
          room: entry.room || "",
          instructor: entry.instructor || "",
        })));
        setTimetableImage(records.timetableImage || null);
        setTimetableError("");
        setLoadedDepartmentId(departmentId);
      })
      .catch((requestError) => {
        if (!active) return;
        setTimetable([]);
        setTimetableImage(null);
        setTimetableError(requestError.message);
        setLoadedDepartmentId(departmentId);
      });

    return () => {
      active = false;
    };
  }, [departmentId]);

  useEffect(() => {
    let active = true;
    if (!studentId) return () => { active = false; };

    api.getStudentAcademicRecords(studentId)
      .then((records) => {
        if (!active) return;
        setExamResults(withRowKeys(records.examResults).map((result) => ({
          ...result,
          grade: result.grade || "",
        })));
        setResultsError("");
        setLoadedStudentId(studentId);
      })
      .catch((requestError) => {
        if (!active) return;
        setExamResults([]);
        setResultsError(requestError.message);
        setLoadedStudentId(studentId);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

  const updateEntry = (setter, rowKey, field, value, numeric = false) => {
    setter((current) =>
      current.map((entry) =>
        entry.rowKey === rowKey
          ? {
              ...entry,
              [field]: numeric && value !== "" ? Number(value) : value,
            }
          : entry
      )
    );
    setTimetableMessage("");
    setResultsMessage("");
  };

  const addTimetableEntry = () => {
    setTimetable((current) => [
      ...current,
      {
        rowKey: crypto.randomUUID(),
        dayOfWeek: "Monday",
        subject: "",
        startTime: "09:00",
        endTime: "10:00",
        room: "",
        instructor: "",
      },
    ]);
    setTimetableMessage("");
  };

  const addExamResult = () => {
    setExamResults((current) => [
      ...current,
      {
        rowKey: crypto.randomUUID(),
        academicYear: "",
        examName: "",
        subject: "",
        marksObtained: "",
        maximumMarks: "",
        grade: "",
      },
    ]);
    setResultsMessage("");
  };

  const saveTimetable = async (event) => {
    event.preventDefault();
    if (!departmentId) return;
    setSavingTimetable(true);
    setTimetableError("");
    setTimetableMessage("");
    try {
      const records = await api.updateDepartmentAcademicRecords(departmentId, {
        timetable: timetable.map(({ rowKey: _rowKey, _id, ...entry }) => entry),
      });
      setTimetable(withRowKeys(records.timetable).map((entry) => ({
        ...entry,
        room: entry.room || "",
        instructor: entry.instructor || "",
      })));
      setTimetableMessage("Department timetable saved.");
    } catch (requestError) {
      setTimetableError(requestError.message);
    } finally {
      setSavingTimetable(false);
    }
  };

  const saveExamResults = async (event) => {
    event.preventDefault();
    if (!studentId) return;
    setSavingResults(true);
    setResultsError("");
    setResultsMessage("");
    try {
      const records = await api.updateStudentAcademicRecords(studentId, {
        examResults: examResults.map(({ rowKey: _rowKey, _id, ...result }) => result),
      });
      setExamResults(withRowKeys(records.examResults).map((result) => ({
        ...result,
        grade: result.grade || "",
      })));
      setResultsMessage("Student exam results saved.");
    } catch (requestError) {
      setResultsError(requestError.message);
    } finally {
      setSavingResults(false);
    }
  };

  const saveBulkExamResults = async (event) => {
    event.preventDefault();
    if (!selectedDepartment || !departmentStudents.length) return;

    const academicYear = bulkExam.academicYear.trim();
    const examName = bulkExam.examName.trim();
    const subject = bulkExam.subject.trim();
    const maximumMarks = Number(bulkExam.maximumMarks);
    const hasInvalidScore = departmentStudents.some((student) => {
      const score = bulkScores[student.id]?.marksObtained;
      const marksObtained = Number(score);
      return (
        score === undefined ||
        score.trim() === "" ||
        !Number.isFinite(marksObtained) ||
        marksObtained < 0 ||
        marksObtained > maximumMarks
      );
    });

    if (!academicYear || !examName || !subject || !Number.isFinite(maximumMarks) || maximumMarks <= 0) {
      setResultsError("Enter a valid academic year, exam, subject, and maximum marks.");
      return;
    }
    if (hasInvalidScore) {
      setResultsError(`Enter marks from 0 to ${maximumMarks} for every student.`);
      return;
    }
    if (!window.confirm(
      `Save ${examName} results for all ${departmentStudents.length} students in ${selectedDepartment.name}? Matching results will be updated.`
    )) {
      return;
    }

    setSavingResults(true);
    setResultsError("");
    setResultsMessage("");
    const failures = [];

    try {
      for (let offset = 0; offset < departmentStudents.length; offset += 8) {
        const batch = departmentStudents.slice(offset, offset + 8);
        const outcomes = await Promise.allSettled(batch.map(async (student) => {
          const records = await api.getStudentAcademicRecords(student.id);
          const entry = {
            academicYear,
            examName,
            subject,
            marksObtained: Number(bulkScores[student.id].marksObtained),
            maximumMarks,
            grade: (bulkScores[student.id].grade || "").trim(),
          };
          let foundMatchingResult = false;
          const nextResults = records.examResults.map((result) => {
            if (
              result.academicYear === academicYear &&
              result.examName === examName &&
              result.subject === subject
            ) {
              foundMatchingResult = true;
              return entry;
            }
            return result;
          });

          if (!foundMatchingResult) {
            if (nextResults.length >= 500) {
              throw new Error("Student already has the maximum of 500 exam results.");
            }
            nextResults.push(entry);
          }
          await api.updateStudentAcademicRecords(student.id, { examResults: nextResults });
          return student.name;
        }));

        outcomes.forEach((outcome, index) => {
          if (outcome.status === "rejected") {
            failures.push({
              detail: `${batch[index].name}: ${
                outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
              }`,
            });
          }
        });
      }

      const savedCount = departmentStudents.length - failures.length;
      if (failures.length) {
        const failureDetails = failures.slice(0, 4).map((failure) => failure.detail).join("; ");
        const remainingCount = failures.length - 4;
        setResultsError(
          `Saved ${savedCount} of ${departmentStudents.length}. Failed: ${failureDetails}` +
          (remainingCount > 0 ? ` and ${remainingCount} more` : "") +
          `. Check the affected students and retry.`
        );
      } else {
        setResultsMessage(`Exam results saved for all ${savedCount} students in ${selectedDepartment.name}.`);
      }
    } catch (requestError) {
      setResultsError(requestError.message || "Could not save the department exam results.");
    } finally {
      setSavingResults(false);
    }
  };

  const uploadTimetableImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setTimetableError("Choose an image that is 2 MB or smaller.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setTimetableError("Choose a JPEG, PNG, or WebP image.");
      return;
    }

    const formData = new FormData();
    formData.append("timetableImage", file);
    setUploadingImage(true);
    setTimetableError("");
    setTimetableMessage("");
    try {
      const result = await api.uploadDepartmentTimetableImage(departmentId, formData);
      setTimetableImage(result.timetableImage);
      setTimetableMessage("Department timetable image uploaded.");
    } catch (requestError) {
      setTimetableError(requestError.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeTimetableImage = async () => {
    if (!window.confirm("Remove this department's timetable image?")) return;
    setUploadingImage(true);
    setTimetableError("");
    setTimetableMessage("");
    try {
      await api.deleteDepartmentTimetableImage(departmentId);
      setTimetableImage(null);
      setTimetableMessage("Department timetable image removed.");
    } catch (requestError) {
      setTimetableError(requestError.message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (!students.length && !departments.length) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Academic Records</h1>
            <p>Manage department timetables and student exam results.</p>
          </div>
        </div>
        <div className="empty-state">
          <h2>No academic records available</h2>
          <p>Add a department or student before managing academic records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Academic Records</h1>
          <p>Timetables are shared by department; exam results belong to each student.</p>
        </div>
      </div>

      <section className="form-card academic-records">
        <div className="academic-selectors">
          <label className="academic-student-select">
            Department timetable
            <select
              value={departmentId}
              onChange={(event) => {
                const nextDepartmentId = event.target.value;
                const nextDepartment = departments.find(
                  (department) => department.id === nextDepartmentId
                );
                const firstStudent = students.find(
                  (student) => student.department === nextDepartment?.name
                );
                setSelectedDepartmentId(nextDepartmentId);
                setSelectedStudentId(firstStudent?.id || "");
                setBulkScores({});
                setTimetableError("");
                setTimetableMessage("");
              }}
              disabled={!departments.length || savingTimetable || savingResults || uploadingImage}
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className="academic-student-select">
            Exam results
            <select
              value={studentOption}
              onChange={(event) => {
                setSelectedStudentId(event.target.value);
                setResultsError("");
                setResultsMessage("");
              }}
              disabled={!departmentStudents.length || savingResults}
            >
              {departmentStudents.length > 0 && (
                <option value={allStudentsOption}>
                  All students — {selectedDepartment.name}
                </option>
              )}
              {departmentStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} — {student.department}
                </option>
              ))}
            </select>
          </label>
        </div>

        <form onSubmit={saveTimetable}>
          <section className="academic-section">
            <div className="academic-section-heading">
              <div>
                <h2>Weekly timetable</h2>
                <p>All students in the selected department share this timetable.</p>
              </div>
              <button
                type="button"
                className="secondary-btn"
                onClick={addTimetableEntry}
                disabled={!departmentId || timetableLoading || savingTimetable || timetable.length >= 60}
              >
                Add class
              </button>
            </div>

            {timetableError && <div className="academic-error" role="alert">{timetableError}</div>}
            {!departmentId ? (
              <p className="academic-empty">Create a department to add its timetable.</p>
            ) : timetableLoading ? (
              <p className="academic-loading" role="status">Loading department timetable…</p>
            ) : (
              <>
                <div className="timetable-image-upload">
                  <label>
                    Upload timetable picture
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={uploadTimetableImage}
                      disabled={savingTimetable || uploadingImage}
                    />
                    <small>Shared with every student in this department · JPEG, PNG, or WebP · maximum 2 MB</small>
                  </label>
                  {uploadingImage && <p role="status">Uploading timetable image…</p>}
                  {timetableImage && (
                    <div className="timetable-image-preview">
                      <img src={timetableImage.dataUrl} alt="Uploaded department timetable" />
                      <div>
                        <span>{timetableImage.fileName}</span>
                        <button
                          type="button"
                          className="academic-remove-btn"
                          onClick={removeTimetableImage}
                          disabled={savingTimetable || uploadingImage}
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {timetable.length ? (
                  <div className="academic-entry-list">
                    {timetable.map((entry) => (
                      <div className="academic-entry" key={entry.rowKey}>
                        <div className="academic-entry-fields timetable-fields">
                          <label>
                            Day
                            <select
                              value={entry.dayOfWeek}
                              onChange={(event) =>
                                updateEntry(setTimetable, entry.rowKey, "dayOfWeek", event.target.value)
                              }
                              disabled={savingTimetable}
                            >
                              {daysOfWeek.map((day) => <option key={day}>{day}</option>)}
                            </select>
                          </label>
                          <label>
                            Subject
                            <input
                              value={entry.subject}
                              onChange={(event) =>
                                updateEntry(setTimetable, entry.rowKey, "subject", event.target.value)
                              }
                              maxLength={100}
                              required
                              disabled={savingTimetable}
                            />
                          </label>
                          <label>
                            Starts
                            <input
                              type="time"
                              value={entry.startTime}
                              onChange={(event) =>
                                updateEntry(setTimetable, entry.rowKey, "startTime", event.target.value)
                              }
                              required
                              disabled={savingTimetable}
                            />
                          </label>
                          <label>
                            Ends
                            <input
                              type="time"
                              value={entry.endTime}
                              onChange={(event) =>
                                updateEntry(setTimetable, entry.rowKey, "endTime", event.target.value)
                              }
                              required
                              disabled={savingTimetable}
                            />
                          </label>
                          <label>
                            Room
                            <input
                              value={entry.room}
                              onChange={(event) =>
                                updateEntry(setTimetable, entry.rowKey, "room", event.target.value)
                              }
                              maxLength={80}
                              disabled={savingTimetable}
                            />
                          </label>
                          <label>
                            Instructor
                            <input
                              value={entry.instructor}
                              onChange={(event) =>
                                updateEntry(setTimetable, entry.rowKey, "instructor", event.target.value)
                              }
                              maxLength={100}
                              disabled={savingTimetable}
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="academic-remove-btn"
                          onClick={() => setTimetable((current) =>
                            current.filter((item) => item.rowKey !== entry.rowKey)
                          )}
                          disabled={savingTimetable}
                        >
                          Remove class
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="academic-empty">No timetable entries yet.</p>
                )}
                <div className="academic-save-row">
                  {timetableMessage && <span role="status">{timetableMessage}</span>}
                  <button type="submit" className="primary-btn" disabled={savingTimetable || uploadingImage}>
                    {savingTimetable ? "Saving…" : "Save department timetable"}
                  </button>
                </div>
              </>
            )}
          </section>
        </form>

        <form onSubmit={bulkMode ? saveBulkExamResults : saveExamResults}>
          <section className="academic-section">
            <div className="academic-section-heading">
              <div>
                <h2>Exam results</h2>
                <p>
                  {bulkMode
                    ? `Enter individual marks for a shared exam. Matching results are updated for ${selectedDepartment.name}.`
                    : "Results are specific to the selected student."}
                </p>
              </div>
              {!bulkMode && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={addExamResult}
                  disabled={!studentId || resultsLoading || savingResults || examResults.length >= 500}
                >
                  Add result
                </button>
              )}
            </div>

            {resultsError && <div className="academic-error" role="alert">{resultsError}</div>}
            {bulkMode ? (
              <>
                <div className="academic-entry-fields bulk-exam-fields">
                  <label>
                    Academic year
                    <input
                      value={bulkExam.academicYear}
                      onChange={(event) => setBulkExam((current) => ({
                        ...current,
                        academicYear: event.target.value,
                      }))}
                      placeholder="2025-2026"
                      maxLength={20}
                      required
                      disabled={savingResults}
                    />
                  </label>
                  <label>
                    Exam
                    <input
                      value={bulkExam.examName}
                      onChange={(event) => setBulkExam((current) => ({
                        ...current,
                        examName: event.target.value,
                      }))}
                      placeholder="Midterm"
                      maxLength={80}
                      required
                      disabled={savingResults}
                    />
                  </label>
                  <label>
                    Subject
                    <input
                      value={bulkExam.subject}
                      onChange={(event) => setBulkExam((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))}
                      maxLength={100}
                      required
                      disabled={savingResults}
                    />
                  </label>
                  <label>
                    Maximum marks
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={bulkExam.maximumMarks}
                      onChange={(event) => setBulkExam((current) => ({
                        ...current,
                        maximumMarks: event.target.value,
                      }))}
                      required
                      disabled={savingResults}
                    />
                  </label>
                </div>
                <div className="academic-entry-list bulk-score-list">
                  {departmentStudents.map((student) => (
                    <div className="academic-entry" key={student.id}>
                      <div className="academic-entry-fields bulk-result-fields">
                        <strong className="bulk-result-student-name">{student.name}</strong>
                        <label>
                          Marks obtained
                          <input
                            type="number"
                            min="0"
                            max={bulkExam.maximumMarks || undefined}
                            step="any"
                            value={bulkScores[student.id]?.marksObtained ?? ""}
                            onChange={(event) => setBulkScores((current) => ({
                              ...current,
                              [student.id]: {
                                ...current[student.id],
                                marksObtained: event.target.value,
                              },
                            }))}
                            required
                            disabled={savingResults}
                          />
                        </label>
                        <label>
                          Grade
                          <input
                            value={bulkScores[student.id]?.grade ?? ""}
                            onChange={(event) => setBulkScores((current) => ({
                              ...current,
                              [student.id]: {
                                ...current[student.id],
                                grade: event.target.value,
                              },
                            }))}
                            maxLength={10}
                            disabled={savingResults}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="academic-save-row">
                  {resultsMessage && <span role="status">{resultsMessage}</span>}
                  <button type="submit" className="primary-btn" disabled={savingResults}>
                    {savingResults ? "Saving results…" : `Save for ${departmentStudents.length} students`}
                  </button>
                </div>
              </>
            ) : !studentId ? (
              <p className="academic-empty">
                {selectedDepartment
                  ? `No students in ${selectedDepartment.name}.`
                  : "Select a department to view its students."}
              </p>
            ) : resultsLoading ? (
              <p className="academic-loading" role="status">Loading student results…</p>
            ) : (
              <>
                {examResults.length ? (
                  <div className="academic-entry-list">
                    {examResults.map((result) => (
                      <div className="academic-entry" key={result.rowKey}>
                        <div className="academic-entry-fields result-fields">
                          <label>
                            Academic year
                            <input
                              value={result.academicYear}
                              onChange={(event) =>
                                updateEntry(setExamResults, result.rowKey, "academicYear", event.target.value)
                              }
                              placeholder="2025-2026"
                              maxLength={20}
                              required
                              disabled={savingResults}
                            />
                          </label>
                          <label>
                            Exam
                            <input
                              value={result.examName}
                              onChange={(event) =>
                                updateEntry(setExamResults, result.rowKey, "examName", event.target.value)
                              }
                              placeholder="Midterm"
                              maxLength={80}
                              required
                              disabled={savingResults}
                            />
                          </label>
                          <label>
                            Subject
                            <input
                              value={result.subject}
                              onChange={(event) =>
                                updateEntry(setExamResults, result.rowKey, "subject", event.target.value)
                              }
                              maxLength={100}
                              required
                              disabled={savingResults}
                            />
                          </label>
                          <label>
                            Marks obtained
                            <input
                              type="number"
                              min="0"
                              max={result.maximumMarks || undefined}
                              step="any"
                              value={result.marksObtained}
                              onChange={(event) =>
                                updateEntry(setExamResults, result.rowKey, "marksObtained", event.target.value, true)
                              }
                              required
                              disabled={savingResults}
                            />
                          </label>
                          <label>
                            Maximum marks
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={result.maximumMarks}
                              onChange={(event) =>
                                updateEntry(setExamResults, result.rowKey, "maximumMarks", event.target.value, true)
                              }
                              required
                              disabled={savingResults}
                            />
                          </label>
                          <label>
                            Grade
                            <input
                              value={result.grade}
                              onChange={(event) =>
                                updateEntry(setExamResults, result.rowKey, "grade", event.target.value)
                              }
                              maxLength={10}
                              disabled={savingResults}
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="academic-remove-btn"
                          onClick={() => setExamResults((current) =>
                            current.filter((item) => item.rowKey !== result.rowKey)
                          )}
                          disabled={savingResults}
                        >
                          Remove result
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="academic-empty">No exam results yet.</p>
                )}
                <div className="academic-save-row">
                  {resultsMessage && <span role="status">{resultsMessage}</span>}
                  <button type="submit" className="primary-btn" disabled={savingResults}>
                    {savingResults ? "Saving…" : "Save student results"}
                  </button>
                </div>
              </>
            )}
          </section>
        </form>
      </section>
    </div>
  );
}

export default AcademicRecords;
