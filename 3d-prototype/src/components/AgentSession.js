import React from 'react';

// Component to display a single tool result
const ToolResult = ({ toolName, status, result }) => {
  // Status indicators
  let statusIndicator = 'ℹ️';
  if (status === 'Running') statusIndicator = '⏳';
  else if (status === 'Finished') statusIndicator = '✅';
  else if (status === 'Error') statusIndicator = '❌';

  return (
    <details className="tool-result" open={status === 'Running'}>
      <summary className="tool-summary">
        Tool: {toolName} - {statusIndicator} {status}
      </summary>
      <div className="tool-content">
        {result === "Executing..." ? (
          <div className="info-message">Tool is currently executing...</div>
        ) : (
          <pre className="result-code">{result}</pre>
        )}
      </div>
    </details>
  );
};

// Component to display the final answer
const FinalAnswer = ({ answer }) => {
  return (
    <div className="final-answer">
      <h3>Final Answer</h3>
      <div className="answer-content">{answer}</div>
    </div>
  );
};

// Main component for displaying the agent session
const AgentSession = ({ sessionId, status, results, finalAnswer, onNewQuery }) => {
  // Sort results by key to ensure they appear in order
  const sortedResults = Object.entries(results || {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="agent-session">
      <div className="session-info">
        <p>Session ID: <code>{sessionId}</code></p>
        <p>Status: <strong>{status.toUpperCase()}</strong></p>
      </div>

      {sortedResults.length > 0 && (
        <div className="results-section">
          <h3>Intermediate Results</h3>
          <div className="results-list">
            {sortedResults.map(([key, result]) => (
              <ToolResult
                key={key}
                toolName={result.tool}
                status={result.status}
                result={result.result}
              />
            ))}
          </div>
        </div>
      )}

      {finalAnswer && (
        <>
          <FinalAnswer answer={finalAnswer} />
          <button className="new-query-button" onClick={onNewQuery}>
            Start New Query
          </button>
        </>
      )}
    </div>
  );
};

export default AgentSession; 