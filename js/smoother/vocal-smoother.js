// ==========================================
// SMOOTHVSTUDIO
// VOCAL SMOOTHER
// V0.7
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
// - VocalTreatmentPlan
//
// V0.7:
//
// - integração segura do plano adaptativo;
// - plano gerado após a análise;
// - plano não altera o caminho DSP;
// - preservação total do processamento V0.6;
// - exposição da última decisão para futuras
//   etapas de DSP.
//
// IMPORTANTE:
//
// O VocalTreatmentPlan nesta etapa atua
// somente como camada de decisão.
//
// Nenhum ganho, corte, compressão,
// de-essing ou reconstrução adicional
// é aplicado por ele.
//
// ==========================================


class VocalSmoother {


    constructor(options = {}) {

        this.version =
            "0.7";


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
        // PLANO DE TRATAMENTO
        // ==================================
        //
        // O módulo é opcional nesta etapa.
        //
        // Se o arquivo ainda não estiver
        // carregado pelo ambiente, o SmoothVStudio
        // continua funcionando exatamente como
        // antes.
        //
        // Isso reduz risco de quebra durante
        // a evolução incremental.
        //
        // ==================================

        this.treatmentPlan =
            options.treatmentPlan ||
            (
                window.VocalTreatmentPlan
                    ? new VocalTreatmentPlan()
                    : null
            );


        // ==================================
        // ESTADO
        // ==================================

        this.lastAnalysis =
            null;


        this.lastTreatmentPlan =
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
    // GERAR PLANO DE TRATAMENTO
    // ======================================
    //
    // Esta função é deliberadamente isolada
    // do caminho de áudio.
    //
    // Qualquer falha na camada de decisão
    // não deve interromper o processamento
    // DSP existente.
    //
    // ======================================

    createTreatmentPlan(
        analysis
    ) {

        if (
            !this.treatmentPlan
        ) {

            return null;
        }


        if (
            typeof this.treatmentPlan.createPlan !==
            "function"
        ) {

            return null;
        }


        try {

            return this.treatmentPlan.createPlan(
                analysis
            );

        } catch (error) {

            console.warn(
                "VocalTreatmentPlan indisponível nesta etapa:",
                error
            );


            return null;
        }
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
        // 2. GERAR PLANO ADAPTATIVO
        // ==================================
        //
        // IMPORTANTE:
        //
        // O plano ainda NÃO controla nenhum
        // parâmetro do processamento.
        //
        // Ele somente registra o que a engine
        // acredita que o vocal necessita.
        //
        // ==================================

        this.lastTreatmentPlan =
            this.createTreatmentPlan(
                analysis
            );


        // ==================================
        // 3. CONTEXTO OFFLINE
        // ==================================

        const context =
            new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );


        // ==================================
        // 4. SOURCE
        // ==================================

        const source =
            context.createBufferSource();


        source.buffer =
            audioBuffer;


        // ==================================
        // 5. VOCAL BODY
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
        // 6. VOCAL TONE
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


            if (
                toneResult.input &&
                toneResult.output
            ) {

                toneInput =
                    toneResult.input;


                toneOutput =
                    toneResult.output;

            } else {

                const resolvedTone =
                    this.resolveNode(
                        toneResult
                    );


                if (
                    resolvedTone
                ) {

                    toneInput =
                        resolvedTone;


                    toneOutput =
                        resolvedTone;
                }
            }
        }


        // ==================================
        // 7. DINÂMICA
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
        // 8. SIBILÂNCIA
        // ==================================

        let finalOutput =
            compressor;


        let sibilanceInput =
            null;


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


            /*
             * A V0.3 do VocalSibilance
             * possui entrada e saída próprias.
             *
             * Isso permite manter o vocal
             * completo como caminho principal
             * e usar a banda sibilante apenas
             * como redução paralela.
             */

            sibilanceInput =
                sibilanceResult.input ||
                null;


            const resolvedSibilanceOutput =
                sibilanceResult.output ||
                this.resolveNode(
                    sibilanceResult
                );


            if (
                sibilanceInput &&
                resolvedSibilanceOutput
            ) {

                compressor.connect(
                    sibilanceInput
                );


                finalOutput =
                    resolvedSibilanceOutput;
            }
        }


        // ==================================
        // 9. CONEXÃO BODY → TONE
        // ==================================

        bodyOutput.connect(
            toneInput
        );


        // ==================================
        // 10. CONEXÃO TONE → DYNAMICS
        // ==================================

        toneOutput.connect(
            compressor
        );


        // ==================================
        // 11. CONEXÃO DIRETA QUANDO
        //     NÃO EXISTIR SIBILANCE
        // ==================================

        if (
            !sibilanceInput
        ) {

            compressor.connect(
                context.destination
            );

        } else {

            finalOutput.connect(
                context.destination
            );
        }


        // ==================================
        // 12. SOURCE → BODY
        // ==================================

        source.connect(
            bodyInput
        );


        // ==================================
        // 13. INICIAR
        // ==================================

        source.start(
            0
        );


        // ==================================
        // 14. RENDER
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
    // ÚLTIMO PLANO DE TRATAMENTO
    // ======================================

    getLastTreatmentPlan() {

        return this.lastTreatmentPlan;
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