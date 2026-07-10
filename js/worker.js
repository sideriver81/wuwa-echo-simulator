let useWasm = false;
let runSimulationWasm, runTransducerSimulationWasm;
let runSimulationJS, runTransducerSimulationJS;

async function initEngines() {
    try {
        const wasmModule = await import('./wasm/rust_engine.js?v=' + Date.now());
        const initWasm = wasmModule.default;
        await initWasm('./wasm/rust_engine_bg.wasm?v=' + Date.now());
        runSimulationWasm = wasmModule.run_simulation_wasm;
        runTransducerSimulationWasm = wasmModule.run_transducer_simulation_wasm;
        useWasm = true;
        console.log("Rust Wasm engine initialized successfully.");
    } catch (e) {
        console.warn("Wasm engine failed to initialize, falling back to JS engine.", e);
        const jsModule = await import('./simulator.js');
        runSimulationJS = jsModule.runSimulation;
        runTransducerSimulationJS = jsModule.runTransducerSimulation;
        useWasm = false;
    }
}

const engineReady = initEngines();

self.onmessage = async function(e) {
    await engineReady;
    
    const settings = e.data;
    
    // Wasm用のシード値を生成 (BigInt = Rustのu64)
    let seed = 0n;
    if (useWasm) {
        seed = BigInt(Date.now() + Math.floor(Math.random() * 1000000));
    }
    
    try {
        let result;
        const progressCallback = (progress) => {
            self.postMessage({
                type: 'progress',
                value: progress
            });
        };

        if (settings.mode === 'transducer') {
            if (useWasm) {
                result = runTransducerSimulationWasm(settings, progressCallback, seed);
            } else {
                result = runTransducerSimulationJS(settings, progressCallback);
            }
        } else {
            if (useWasm) {
                result = runSimulationWasm(settings, progressCallback, seed);
            } else {
                result = runSimulationJS(settings, progressCallback);
            }
        }
        
        self.postMessage({
            type: 'done',
            result: result
        });
    } catch (error) {
        console.error(error);
        self.postMessage({
            type: 'error',
            message: error.message || String(error)
        });
    }
};
