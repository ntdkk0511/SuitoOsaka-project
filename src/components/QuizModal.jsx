import React from 'react';

export default function QuizModal({
  currentSpot,
  quizSelected,
  setQuizSelected,
  quizFeedback,
  onClose,
  onSubmit
}) {
  return (
    <div className="aquatic-modal-overlay">
      <div className="aquatic-modal-content">
        <span className="modal-badge">MISSION</span>
        <h3>歴史・舟運クイズ</h3>
        <p className="quiz-q">{currentSpot.quiz.q}</p>
        
        <div className="quiz-choices-vertical">
          {currentSpot.quiz.choices.map((choice, idx) => (
            <button
              key={idx}
              className={`quiz-choice-btn ${quizSelected === idx ? 'selected' : ''}`}
              onClick={() => setQuizSelected(idx)}
            >
              {idx + 1}. {choice}
            </button>
          ))}
        </div>

        {quizFeedback && <p className="feedback-message">{quizFeedback}</p>}

        <div className="modal-footer-btns">
          <button className="cancel-btn" onClick={onClose}>離脱する</button>
          <button
            className="confirm-btn"
            onClick={onSubmit}
            disabled={quizSelected === null}
          >
            <span style={{ color: '#fff' }}>回答する</span>
          </button>
        </div>
      </div>
    </div>
  );
}