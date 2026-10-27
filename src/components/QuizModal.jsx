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
              // フィードバック表示中（判定結果表示中）はタップ無効化
              disabled={!!quizFeedback}
              className={`quiz-choice-btn ${quizSelected === idx ? 'selected' : ''}`}
              onClick={() => {
                // ✨変更点: タップした瞬間に選択状態にして即座に判定関数を実行
                setQuizSelected(idx);
                onSubmit(idx);
              }}
            >
              {idx + 1}. {choice}
            </button>
          ))}
        </div>

        {quizFeedback && <p className="feedback-message">{quizFeedback}</p>}

        <div className="modal-footer-btns">
          {/* ✨変更点: 即時判定のため「回答する」ボタンを削除し、離脱ボタンのみ配置 */}
          <button className="cancel-btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}