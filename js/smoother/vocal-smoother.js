// ==========================================
// SMOOTHVSTUDIO
// VOCAL SMOOTHER
// V0.8
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
// - SpectralProfile
// - SpectralTreatmentBridge
// - VocalBody
// - VocalTone
// - VocalDynamics
// - VocalSibilance
// - VocalTreatmentPlan
//
// V0.8:
//
// - integração segura do perfil espectral;
// - integração do SpectralTreatmentBridge;
// - contexto espectral em modo observação;
// - plano adaptativo continua isolado do DSP;
// - preservação total do caminho DSP V0.7;
// - exposição da última decisão espectral;
// - falhas na camada espectral não interrompem
//   o processamento principal.
//
// IMPORTANTE:
//
// O SpectralTreatmentBridge nesta etapa
// atua somente como camada de observação.
//
// Nenhum ganho, corte, compressão,
// de-essing ou reconstrução adicional
// é aplicado por ele.
//
// ==========================================


class VocalSmoother {


    constructor(options = {}) {


        this.version =
            "0.8";


        // ==================================
        // ANALYZER
        // ==================================

        this.analyzer =
            options.analyzer ||
            new VocalAnalyzer();


        // ==================================
        // SPECTRAL PROFILE
        // ==================================
        //
        // Opcional nesta etapa.
        //
        // Se o módulo ainda não estiver
        // disponível, o processamento
        // continua normalmente.
        //
        // ==================================

        this.spectralProfile =
            options.spectralProfile ||
            (
                window.SpectralProfile
                    ? new SpectralProfile()
                    : null
            );


        // ==================================
        // SPECTRAL TREATMENT BRIDGE
        // ==================================
        //
        // Também é opcional.
        //
        // O Bridge apenas interpreta o
        // perfil espectral nesta etapa.
        //
        // ==================================

        this.spectralTreatmentBridge =
            options.spectralTreatmentBridge ||
            (
                window.SpectralTreatmentBridge
                    ? new SpectralTreatmentBridge()
                    : null
            );


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


        this.lastSpectralProfile =
            null;


        this.lastSpectralContext =
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
    // GERAR PERFIL ESPECTRAL
    // ======================================
    //
    // Esta função permanece completamente
    // fora do caminho DSP.
    //
    // O perfil utiliza a análise já realizada
    // pelo VocalAnalyzer.
    //
    // ======================================

    createSpectralProfile(
        analysis
    ) {

        if (
            !this.spectralProfile
        ) {

            return null;
        }


        if (
            typeof this.spectralProfile.analyze !==
            "function"
        ) {

            return null;
        }


        try {

            return this.spectralProfile.analyze(
                analysis
            );

        } catch (error) {

            console.warn(
                "SpectralProfile indisponível nesta etapa:",
                error
            );


            return null;
        }
    }


    // ======================================
    // GERAR CONTEXTO ESPECTRAL
    // ======================================
    //
    // IMPORTANTE:
    //
    // O contexto produzido aqui é apenas
    // observacional.
    //
    // Ele NÃO controla o DSP.
    //
    // ======================================

    createSpectralContext(
        spectralProfile
    ) {

        if (
            !spectralProfile
        ) {

            return null;
        }


        if (
            !this.spectralTreatmentBridge
        ) {

            return null;
        }


        if (
            typeof this.spectralTreatmentBridge
                .createPlanningContext !==
            "function"
        ) {

            return null;
        }


        try {

            return this.spectralTreatmentBridge
                .createPlanningContext(
                    spectralProfile
                );

        } catch (error) {

            console.warn(
                "SpectralTreatmentBridge indisponível nesta etapa:",
                error
            );


            return null;
        }
    }


    // ======================================
    // GERAR PLANO DE TRATAMENTO
    // ======================================
    //
    // Esta função é deliberadamente isolada
    // do caminho de áudio.
    //
    // O plano recebe a análise principal
    // e, quando disponível, o contexto
    // espectral em modo observação.
    //
    // ======================================

    createTreatmentPlan(
        analysis,
        spectralContext = null
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

            const plan =
                this.treatmentPlan.createPlan(
                    analysis
                );


            /*
             * O plano original continua sendo
             * preservado.
             *
             * Nesta etapa o contexto espectral
             * é apenas anexado como informação
             * de observação.
             *
             * Nenhum parâmetro DSP é alterado.
             */

            if (
                plan &&
                spectralContext
            ) {

                plan.spectralContext =
                    spectralContext;
            }


            return plan;

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
        // 2. PERFIL ESPECTRAL
        // ==================================
        //
        // Apenas análise.
        //
        // Nenhum processamento de áudio
        // acontece aqui.
        //
        // ==================================

        this.lastSpectralProfile =
            this.createSpectralProfile(
                analysis
            );


        // ==================================
        // 3. CONTEXTO ESPECTRAL
        // ==================================
        //
        // Apenas observação.
        //
        // ==================================

        this.lastSpectralContext =
            this.createSpectralContext(
                this.lastSpectralProfile
            );


        // ==================================
        // 4. GERAR PLANO ADAPTATIVO
        // ==================================
        //
        // IMPORTANTE:
        //
        // O contexto espectral é apenas
        // anexado ao plano.
        //
        // Ele ainda NÃO controla nenhum
        // parâmetro do processamento.
        //
        // ==================================

        this.lastTreatmentPlan =
            this.createTreatmentPlan(
                analysis,
                this.lastSpectralContext
            );


        // ==================================
        // 5. CONTEXTO OFFLINE
        // ==================================

        const context =
            new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );


        // ==================================
        // 6. SOURCE
        // ==================================

        const source =
            context.createBufferSource();


        source.buffer =
            audioBuffer;


        // ==================================
        // 7. VOCAL BODY
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
        // 8. VOCAL TONE
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
        // 9. DINÂMICA
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
        // 10. SIBILÂNCIA
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
        // 11. CONEXÃO BODY → TONE
        // ==================================

        bodyOutput.connect(
            toneInput
        );


        // ==================================
        // 12. CONEXÃO TONE → DYNAMICS
        // ==================================

        toneOutput.connect(
            compressor
        );


        // ==================================
        // 13. CONEXÃO DIRETA QUANDO
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
        // 14. SOURCE → BODY
        // ==================================

        source.connect(
            bodyInput
        );


        // ==================================
        // 15. INICIAR
        // ==================================

        source.start(
            0
        );


        // ==================================
        // 16. RENDER
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
    // ÚLTIMO PERFIL ESPECTRAL
    // ======================================

    getLastSpectralProfile() {

        return this.lastSpectralProfile;
    }


    // ======================================
    // ÚLTIMO CONTEXTO ESPECTRAL
    // ======================================

    getLastSpectralContext() {

        return this.lastSpectralContext;
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