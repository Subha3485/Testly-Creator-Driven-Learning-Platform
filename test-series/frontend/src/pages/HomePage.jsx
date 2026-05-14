import { useState } from "react";

const PRACTICE_TOPICS = [
  { id: "532-inequality-coded-inequality-for-mains-chapter-wise-dpp-english", name: "Inequality (Coded) for Mains", questions: 112 },
  { id: "570-linear-arrangements-chapter-wise-dpp-english-1", name: "Linear Arrangements", questions: 145 },
  { id: "578-circular-arrangements-chapter-wise-dpp-english-1", name: "Circular Arrangements", questions: 127 },
  { id: "578-square-arrangements-chapter-wise-dpp-english-1", name: "Square Arrangements", questions: 107 },
  { id: "590-rectangle-arrangements-chapter-wise-dpp-english-1", name: "Rectangle Arrangements", questions: 98 },
  { id: "596-triangular-arrangements-chapter-wise-dpp-english-1", name: "Triangular Arrangements", questions: 70 },
  { id: "602-scheduling-puzzles-01-chapter-wise-dpp-english", name: "Scheduling Puzzles 01", questions: 30 },
  { id: "603-scheduling-puzzles-02-chapter-wise-dpp-english", name: "Scheduling Puzzles 02", questions: 16 },
  { id: "alphabetical-series-for-mains-chapter-wise-dpp-english", name: "Alphabetical Series for Mains", questions: 24 },
  { id: "alphabets-basics-chapter-wise-dpp-english", name: "Alphabets Basics", questions: 20 },
  { id: "blood-relation-chapter-wise-dpp-english", name: "Blood Relation", questions: 7 },
  { id: "blood-relations-for-mains-chapter-wise-dpp-english", name: "Blood Relations for Mains", questions: 52 },
  { id: "box-puzzle-chapter-wise-dpp-english", name: "Box Puzzle", questions: 13 },
  { id: "circular-arrangements-chapter-wise-dpp-english", name: "Circular Arrangements", questions: 25 },
  { id: "coding-decoding-chapter-wise-dpp-english", name: "Coding Decoding", questions: 30 },
  { id: "coding-decoding-for-mains-chapter-wise-dpp-english", name: "Coding Decoding for Mains", questions: 100 },
  { id: "conditional-coding-chapter-wise-dpp-english", name: "Conditional Coding", questions: 68 },
  { id: "data-sufficiency-for-mains-chapter-wise-dpp-english", name: "Data Sufficiency for Mains", questions: 50 },
  { id: "designation-based-puzzles-chapter-wise-dpp-english", name: "Designation Based Puzzles", questions: 14 },
  { id: "direction-distance-chapter-wise-dpp-english", name: "Direction Distance", questions: 30 },
  { id: "direction-distance-for-mains-chapter-wise-dpp-english", name: "Direction Distance for Mains", questions: 79 },
  { id: "flat-floor-puzzles-chapter-wise-dpp-english", name: "Flat Floor Puzzles", questions: 16 },
  { id: "floor-puzzle-chapter-wise-dpp-english", name: "Floor Puzzle", questions: 41 },
  { id: "inequality-chapter-wise-dpp-english", name: "Inequality", questions: 14 },
  { id: "input-output-chapter-wise-dpp-english", name: "Input Output", questions: 25 },
  { id: "linear-arrangements-chapter-wise-dpp-english", name: "Linear Arrangements", questions: 39 },
  { id: "multiple-steps-based-alphabet-chapter-wise-dpp-english", name: "Multiple Steps Based Alphabet", questions: 25 },
  { id: "order-ranking-chapter-wise-dpp-english", name: "Order Ranking", questions: 20 },
  { id: "parallel-row-arrangement-chapter-wise-dpp-english", name: "Parallel Row Arrangement", questions: 54 },
  { id: "parallel-row-seating-arrangement-chapter-wise-dpp-english", name: "Parallel Row Seating Arrangement", questions: 22 },
  { id: "rectangle-arrangements-chapter-wise-dpp-english", name: "Rectangle Arrangements", questions: 44 },
  { id: "square-arrangements-chapter-wise-dpp-english", name: "Square Arrangements", questions: 22 },
  { id: "syllogism-chapter-wise-dpp-english", name: "Syllogism", questions: 15 },
  { id: "syllogism-for-mains-chapter-wise-dpp-english", name: "Syllogism for Mains", questions: 83 },
  { id: "tabular-data-interpretations-chapter-wise-dpp-english", name: "Tabular Data Interpretations", questions: 101 },
  { id: "tabular-puzzle-chapter-wise-dpp-english", name: "Tabular Puzzle", questions: 30 },
  { id: "time-speed-distance-chapter-wise-dpp-english", name: "Time Speed Distance", questions: 60 },
  { id: "triangular-arrangements-chapter-wise-dpp-english", name: "Triangular Arrangements", questions: 31 }
];

export default function HomePage() {
  const handleTopicClick = (topic) => {
    // Navigate to practice runner with selected topic
    window.location.assign(`/banking/practice/run/test?topic=${topic.name}&mode=practice`);
  };

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="card">
        <div className="row spread">
          <div>
            <h3>Select a Topic to Practice</h3>
            <p>Choose from our comprehensive collection of Banking Reasoning topics</p>
          </div>
          <span className="badge">PRACTICE MODE</span>
        </div>

        <div className="grid cards" style={{ marginTop: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {PRACTICE_TOPICS.map((topic) => (
            <article key={topic.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
              <div className="label" style={{ fontSize: '0.9em' }}>{topic.name}</div>
              <p style={{ marginTop: 8, fontSize: '0.85em', color: '#666' }}>{topic.questions} questions</p>
              <button 
                className="primary" 
                type="button" 
                onClick={() => handleTopicClick(topic)}
                style={{ marginTop: 'auto' }}
              >
                Start Practice
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}