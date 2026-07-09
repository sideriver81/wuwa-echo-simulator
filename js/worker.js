import { runSimulation, runTransducerSimulation } from './simulator.js';

self.onmessage = function(e) {
    const settings = e.data;
    
    try {
        let result;
        if (settings.mode === 'transducer') {
            result = runTransducerSimulation(settings, (progress) => {
                self.postMessage({
                    type: 'progress',
                    value: progress
                });
            });
        } else {
            result = runSimulation(settings, (progress) => {
                self.postMessage({
                    type: 'progress',
                    value: progress
                });
            });
        }
        
        self.postMessage({
            type: 'done',
            result: result
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};
