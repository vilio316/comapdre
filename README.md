# Compadre

Your all-in-one study companion. Upload your class materials, generate practice questions, scan documents for text, and prep for exams — all in one place.

---

## What Compadre does

**Compadre** is a web app built for students who want to keep their study materials organised and turn them into active learning tools. Think of it as a digital study binder that does more than just store files.

### Core features

**Document hub** — Upload your PDFs and DOCX files, tag them by subject, and search across everything. Every file is stored securely in the cloud and viewable right in the browser.

**MCQ generator** — Turn your notes into multiple-choice practice questions. Test yourself on the material you've actually been studying.

**Exam prep** — Create flashcards and summaries from your documents to review before test day.

**OCR (optical character recognition)** — Snap a photo of a whiteboard, handout, or textbook page and extract the text so you can search and study it digitally.

---

## How it works

1. Sign in with your email, Google account, or Apple ID.
2. Upload your files — lecture notes, readings, past exams.
3. Use the tools to quiz yourself, generate summaries, or pull text from images.

Everything syncs to the cloud, so your materials are available wherever you log in.

---

## Tech notes

Built with Next.js and styled with Tailwind CSS. Files are stored on Cloudflare R2. Authentication is handled by Better Auth. The app works as a progressive web app — you can install it on your phone or desktop for quick access.

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
