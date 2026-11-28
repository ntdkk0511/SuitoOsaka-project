import React from 'react';

export default function QuizModal({ currentSpot, isCurrentCleared = false, quizSelected, setQuizSelected, quizFeedback, feedbackCorrect, isSubmitting, onClose, onSubmit }) {
  const quizText = value => {
    if (isCurrentCleared) return value;
    return [currentSpot.name, currentSpot.englishName].filter(Boolean).reduce((text, name) => text.replaceAll(name, '???'), value);
  };
  return (
    <div className="aquatic-modal-overlay">
      <div className="aquatic-modal-content mission-modal">
        <span className="modal-badge">CHECKPOINT MISSION</span>
        <p className="mission-step">街を歩く <span>›</span> ミッション <span>›</span> カードを集める</p>
        <h3>街の記憶クイズ</h3>
        <p className="quiz-q">{quizText(currentSpot.quiz.q)}</p>
        <div className="quiz-choices-vertical">
          {currentSpot.quiz.choices.map((choice, idx) => (
            <button key={idx} disabled={!!quizFeedback || isSubmitting} className={`quiz-choice-btn ${quizSelected === idx ? 'selected' : ''}`} onClick={() => { setQuizSelected(idx); onSubmit(idx); }}>
              <span className="mission-choice-index">{String(idx + 1).padStart(2, '0')}</span>{quizText(choice)}
            </button>
          ))}
        </div>
        {quizFeedback && <p className={`feedback-message ${feedbackCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>{quizFeedback}</p>}
        <p className="mission-reward-note">正解すると、この場所のカードパックを獲得できます。</p>
        <div className="modal-footer-btns"><button className="cancel-btn" onClick={onClose}>閉じる</button></div>
      </div>
      <style>{`.mission-modal{border-radius:24px;border:1px solid rgba(255,255,255,.9);box-shadow:0 22px 60px rgba(11,56,67,.2)}.mission-modal .modal-badge{display:inline-flex;padding:6px 10px;background:#ddf5fa;border-radius:99px;color:#287f9b!important;letter-spacing:.1em}.mission-step{margin:12px 0 0;color:#66848a!important;font-size:11px;letter-spacing:.03em}.mission-step span{padding:0 5px;color:#80cfe3!important}.mission-modal h3{color:#174b5a!important}.mission-choice-index{flex:none;color:#287f9b!important;font-size:11px;letter-spacing:.1em}.mission-modal .quiz-choice-btn{display:flex;align-items:center;gap:12px;min-height:48px;border-radius:13px;border-color:#d9e9e7;color:#315a62!important}.mission-modal .quiz-choice-btn.selected{background:#ddf5fa;border-color:#80cfe3;color:#174b5a!important}.mission-reward-note{margin:12px 0 0;color:#66848a!important;font-size:12px;line-height:1.5;text-align:center}.mission-modal .cancel-btn{color:#52727a!important}.feedback-correct{color:#059669!important;font-weight:800}.feedback-wrong{color:#dc2626!important;font-weight:800}`}</style>
    </div>
  );
}
