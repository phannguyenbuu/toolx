// Price Calculator Web Worker
// Handles heavy calculations in background thread

/* eslint-disable no-restricted-globals */
// 'self' is the global object in Web Workers

import {
  Paper,
  WorkerInput,
  WorkerOutput,
} from '../utils/calculatorTypes';
import { calculateMainOptions, calculateSuggestion } from './priceCalculator/index';

// Worker message handler
let suggestionTimeout: ReturnType<typeof setTimeout> | null = null;

self.onmessage = function(e: MessageEvent<WorkerInput>) {
  const { type, payload } = e.data;

  if (type === 'calculate') {
    try {
      const {
        width, height, quantity, inputs, machines, papers, config,
        extraFinishings, isCustomPaper, customPaper
      } = payload;

      // Prepare active papers
      const activePapers: Paper[] = isCustomPaper && customPaper
        ? [{
            type: 'Custom',
            name: customPaper.name,
            gsm: parseInt(customPaper.gsm) || 0,
            size: `${customPaper.width}x${customPaper.height}`,
            width: parseFloat(customPaper.width) || 0,
            height: parseFloat(customPaper.height) || 0,
            price: parseFloat(customPaper.price) || 0
          }]
        : papers.filter(p => p.type === inputs.selectedPaperType && p.gsm === inputs.selectedGSM);

      // Calculate main options first (priority)
      const options = calculateMainOptions(
        width, height, quantity, inputs, machines, activePapers, config, extraFinishings
      );

      // Send main result immediately
      const mainResult: WorkerOutput = {
        type: 'main_result',
        payload: { options }
      };
      self.postMessage(mainResult);

      // Clear previous suggestion timeout (PA2 - Separate debounce)
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
      }

      // Calculate suggestion with delay (PA2)
      if (options.length > 0) {
        suggestionTimeout = setTimeout(() => {
          try {
            const suggestion = calculateSuggestion(
              width, height, quantity,
              options[0].ups, options[0].costs.total,
              inputs, machines, activePapers, config, extraFinishings
            );

            const suggestionResult: WorkerOutput = {
              type: 'suggestion_result',
              payload: { suggestion }
            };
            self.postMessage(suggestionResult);
          } catch (err) {
            const errorResult: WorkerOutput = {
              type: 'error',
              payload: { message: `Suggestion error: ${err}` }
            };
            self.postMessage(errorResult);
          }
        }, 1000); // 1 second delay for suggestion
      } else {
        // No options, no suggestion
        const suggestionResult: WorkerOutput = {
          type: 'suggestion_result',
          payload: { suggestion: null }
        };
        self.postMessage(suggestionResult);
      }

    } catch (err) {
      const errorResult: WorkerOutput = {
        type: 'error',
        payload: { message: `Calculation error: ${err}` }
      };
      self.postMessage(errorResult);
    }
  }
};

export {};
