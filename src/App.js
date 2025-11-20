import React from 'react';
import PDFViewer from './PDFViewer';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <h1>CloudMotiv — Case Study</h1>
          <p className="sub">PDF highlighter demo — Maersk Q2 2025 (click [3])</p>
        </div>
        <div className="meta">
          <div>Student: <strong>Silla Kamal Kanth</strong></div>
          <div>Reg No: <strong>AP22110011652</strong></div>
        </div>
      </header>
      <main className="main">
        <PDFViewer pdfUrl="/maersk_q2_2025.pdf" />
      </main>
      <footer className="footer">
        <small>Built for CloudMotiv IT Technologies Pvt Ltd case study — polished UI and highlight logic.</small>
      </footer>
    </div>
  );
}
