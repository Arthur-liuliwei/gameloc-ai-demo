"use client";

import { useState } from "react";
import PageHeader from "@/components/page-header";

const genreOptions = ["AAA Cinematic", "MOBA", "Fantasy RPG", "Casual Mobile"] as const;

type GenreOption = (typeof genreOptions)[number];

export default function CreateProjectPage() {
  const [projectName, setProjectName] = useState("My New Localization Project");
  const [sourceLanguage, setSourceLanguage] = useState("English (en-US)");
  const [targetLanguage, setTargetLanguage] = useState("Simplified Chinese (zh-CN)");
  const [genreTone, setGenreTone] = useState<GenreOption>("Fantasy RPG");
  const [submitted, setSubmitted] = useState(false);

  function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Create Project"
        subtitle="Set up a new game localization project and preview settings before starting the workflow."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="gl-panel">
          <h2 className="gl-heading-section">Project setup</h2>
          <p className="mt-1 text-sm text-slate-400">Demo stores values in React state only (no database).</p>

          <form className="mt-5 space-y-4" onSubmit={handleCreateProject}>
            <div>
              <label htmlFor="projectName" className="mb-2 block text-sm text-slate-300">
                Project name
              </label>
              <input
                id="projectName"
                type="text"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Enter project name"
                className="gl-input w-full"
              />
            </div>

            <div>
              <label htmlFor="sourceLanguage" className="mb-2 block text-sm text-slate-300">
                Source language
              </label>
              <input
                id="sourceLanguage"
                type="text"
                value={sourceLanguage}
                onChange={(event) => setSourceLanguage(event.target.value)}
                className="gl-input w-full"
              />
            </div>

            <div>
              <label htmlFor="targetLanguage" className="mb-2 block text-sm text-slate-300">
                Target language
              </label>
              <input
                id="targetLanguage"
                type="text"
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
                className="gl-input w-full"
              />
            </div>

            <div>
              <label htmlFor="genreTone" className="mb-2 block text-sm text-slate-300">
                Game genre / tone
              </label>
              <select
                id="genreTone"
                value={genreTone}
                onChange={(event) => setGenreTone(event.target.value as GenreOption)}
                className="gl-select w-full"
              >
                {genreOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="gl-btn-primary w-full py-2.5 text-sm">
              Create project
            </button>
          </form>

          {submitted ? (
            <p className="gl-toast mt-4">Project created (demo): values are stored in local React state.</p>
          ) : null}
        </section>

        <section className="gl-panel">
          <h2 className="gl-heading-section">Live preview</h2>
          <p className="mt-1 text-sm text-slate-400">Updates as you type.</p>

          <article className="gl-subpanel mt-5 border-cyan-500/20 bg-gradient-to-br from-slate-900/90 to-slate-950">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-300">GameLoc AI</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{projectName || "Untitled project"}</h3>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="gl-card px-3 py-2">
                <dt className="text-slate-400">Source language</dt>
                <dd className="mt-1 text-slate-100">{sourceLanguage || "—"}</dd>
              </div>
              <div className="gl-card px-3 py-2">
                <dt className="text-slate-400">Target language</dt>
                <dd className="mt-1 text-slate-100">{targetLanguage || "—"}</dd>
              </div>
              <div className="gl-card px-3 py-2">
                <dt className="text-slate-400">Genre / tone</dt>
                <dd className="mt-1 text-slate-100">{genreTone}</dd>
              </div>
            </dl>
          </article>
        </section>
      </div>
    </main>
  );
}
