// ==========================================
// SMOOTHVSTUDIO
// VOCAL SMOOTHER
// V0.5
// ==========================================
//
// Orquestrador principal do processamento.
//
// Este módulo NÃO contém a inteligência DSP
// individual.
//
// Ele coordena:
//
// - VocalAnalyzer
// - VocalBody
// - VocalTone
// - VocalDynamics
// - VocalSibilance
//
// Cada módulo pode evoluir separadamente.
//
// ==========================================


class VocalSmoother {


    constructor(options = {}) {

        this.version =
            "0.5";


        // ==================================
        // ANALYZER
        // ==================================

        this.analyzer =
            options.analyzer ||
            new VocalAnalyzer();


        // ==================================
        // BODY
        // ==================================

        this.body =
            options.body ||
            new VocalBody();


        // ==================================
        // TONE
        // ==================================

        this.tone =
            options.tone ||
            (
                window.VocalTone
                    ? new VocalTone()
                    : null
            );


        // ==================================
        // DYNAMICS
        // ==================================

        this.dynamics =
            options.dynamics ||
            new VocalDynamics();


        // ==================================
        // SIBILANCE
        // ==================================

        this.sibilance =
            options.sibilance ||
            (
                window.VocalSibilance
                    ? new VocalSibilance()
                    : null
            );


        // ==================================
        // ESTADO
        // ==================================

        this.lastAnalysis =
            null;


        this.lastSettings =
            null;


        this.lastBodySettings =
            null;


        this.lastToneSettings =
            null;


        this.lastSibilanceSettings =
            null;
    }


    // ======================================
    // CLAMP
    // ======================================

    clamp(
        value,
        min,
        max
    ) {

        return Math.min(
            max,
            Math.max(
                min,
                value
            )
        );
    }


    // ======================================
    // OBTER AUDIO NODE
    // ======================================
    //
    // Alguns módulos podem retornar:
    //
    // AudioNode
    //
    // ou:
    //
    // {
    //     processor: AudioNode
    // }
    //
    // ou:
    //
    // {
    //     input: AudioNode,
    //     output: AudioNode
    // }
    //
    // Este método mantém o orquestrador
    // compatível com diferentes versões
    // dos módulos.
    // ======================================

    resolveNode(
        result
    ) {

        if (
            !result
        ) {

            return null;
        }


        if (
            typeof result.connect ===
            "function"
        ) {

            return result;
        }


        if (
            result.output &&
            typeof result.output.connect ===
            "function"
        ) {

            return result.output;
        }


        if (
            result.processor &&
            typeof result.processor.connect ===
            "function"
        ) {

            return result.processor;
        }


        return null;
    }


    // ======================================
    // PROCESSAR
    // ======================================

    async process(
        audioBuffer
    ) {

        if (
            !audioBuffer
        ) {

            throw new Error(
                "AudioBuffer inválido."
            );
        }


        // ==================================
        // 1. ANALISAR
        // ==================================

        const analysis =
            this.analyzer.analyzeBuffer(
                audioBuffer
            );


        this.lastAnalysis =
            analysis;


        // ==================================
        // 2. CONTEXTO OFFLINE
        // ==================================

        const context =
            new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );


        // ==================================
        // 3. SOURCE
        // ==================================

        const source =
            context.createBufferSource();


        source.buffer =
            audioBuffer;


        // ==================================
        // 4. VOCAL BODY
        // ==================================
        //
        // Primeira etapa da nova cadeia.
        //
        // O módulo observa a análise e decide
        // automaticamente se existe excesso
        // de grave / low-mid.
        //
        // Se o vocal estiver equilibrado,
        // a intervenção tende a zero.
        // ==================================

        const bodyResult =
            this.body.createProcessor(
                context,
                analysis
            );


        this.lastBodySettings =
            bodyResult.settings ||
            null;


        const bodyInput =
            bodyResult.input ||
            this.resolveNode(
                bodyResult
            );


        const bodyOutput =
            bodyResult.output ||
            this.resolveNode(
                bodyResult
            );


        if (
            !bodyInput ||
            !bodyOutput
        ) {

            throw new Error(
                "VocalBody não retornou uma cadeia de áudio válida."
            );
        }


        // ==================================
        // 5. VOCAL TONE
        // ==================================

        let toneInput =
            bodyOutput;


        let toneOutput =
            bodyOutput;


        if (
            this.tone &&
            typeof this.tone.createProcessor ===
            "function"
        ) {

            const toneResult =
                this.tone.createProcessor(
                    context,
                    analysis
                );


            this.lastToneSettings =
                toneResult.settings ||
                null;


            const resolvedTone =
                this.resolveNode(
                    toneResult
                );


            if (
                toneResult.input &&
                toneResult.output
            ) {

                toneInput =
                    toneResult.input;


                toneOutput =
                    toneResult.output;

            } else if (
                resolvedTone
            ) {

                toneInput =
                    resolvedTone;


                toneOutput =
                    resolvedTone;
            }
        }


        // ==================================
        // 6. DINÂMICA
        // ==================================

        const dynamicsResult =
            this.dynamics.createProcessor(
                context,
                analysis
            );


        const compressor =
            this.resolveNode(
                dynamicsResult
            );


        if (
            !compressor
        ) {

            throw new Error(
                "VocalDynamics não retornou um processador válido."
            );
        }


        this.lastSettings =
            dynamicsResult.settings ||
            null;


        // ==================================
        // 7. SIBILÂNCIA
        // ==================================

        let sibilanceNode =
            compressor;


        if (
            this.sibilance &&
            typeof this.sibilance.createProcessor ===
            "function"
        ) {

            const sibilanceResult =
                this.sibilance.createProcessor(
                    context,
                    analysis
                );


            this.lastSibilanceSettings =
                sibilanceResult.settings ||
                null;


            const resolvedSibilance =
                this.resolveNode(
                    sibilanceResult
                );


            if (
                resolvedSibilance
            ) {

                sibilanceNode =
                    resolvedSibilance;
            }
        }


        // ==================================
        // 8. CAMINHO PROCESSADO
        // ==================================

        bodyOutput.connect(
            toneOutput === bodyOutput
                ? compressor
                : toneInput
        );


        // ==================================
        // CONEXÃO TONE → DYNAMICS
        // ==================================

        if (
            toneOutput !== bodyOutput
        ) {

            toneOutput.connect(
                compressor
            );
        }


        // ==================================
        // DINÂMICA → SIBILÂNCIA
        // ==================================

        if (
            sibilanceNode !== compressor
        ) {

            compressor.connect(
                sibilanceNode
            );
        }


        // ==================================
        // 9. SAÍDA
        // ==================================

        sibilanceNode.connect(
            context.destination
        );


        // ==================================
        // 10. INICIAR
        // ==================================

        source.connect(
            bodyInput
        );


        source.start(0);


        // ==================================
        // 11. RENDER
        // ==================================

        const result =
            await context.startRendering();


        return result;
    }


    // ======================================
    // ÚLTIMA ANÁLISE
    // ======================================

    getLastAnalysis() {

        return this.lastAnalysis;
    }


    // ======================================
    // CONFIGURAÇÃO DINÂMICA
    // ======================================

    getLastSettings() {

        return this.lastSettings;
    }


    // ======================================
    // CONFIGURAÇÃO DO BODY
    // ======================================

    getLastBodySettings() {

        return this.lastBodySettings;
    }


    // ======================================
    // CONFIGURAÇÃO DO TONE
    // ======================================

    getLastToneSettings() {

        return this.lastToneSettings;
    }


    // ======================================
    // CONFIGURAÇÃO DA SIBILÂNCIA
    // ======================================

    getLastSibilanceSettings() {

        return this.lastSibilanceSettings;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.VocalSmoother =
    VocalSmoother;