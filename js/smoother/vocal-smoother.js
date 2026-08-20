// ==========================================
// SMOOTHVSTUDIO
// VOCAL SMOOTHER
// V1.0
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
// - SpectralRegionalMeasurement
// - SpectralRegionalRuntime
// - SpectralProfile
// - SpectralTreatmentBridge
// - SpectralDiagnosticObserver
// - VocalBody
// - VocalTone
// - VocalDynamics
// - VocalSibilance
// - VocalTreatmentPlan
//
// V1.0:
//
// - integração segura da medição espectral
//   regional;
// - runtime regional em modo observação;
// - perfil espectral preservado;
// - SpectralTreatmentBridge preservado;
// - diagnóstico espectral preservado;
// - plano adaptativo continua isolado do DSP;
// - caminho DSP anterior preservado;
// - falhas na camada espectral não interrompem
//   o processamento principal.
//
// IMPORTANTE:
//
// O SpectralRegionalRuntime nesta etapa atua
// somente como camada de observação.
//
// Nenhum ganho, corte, compressão,
// de-essing ou reconstrução adicional
// é aplicado por ele.
//
// ==========================================


class VocalSmoother {


    constructor(
        options = {}
    ) {


        this.version =
            "1.0";


        // ==================================
        // ANALYZER
        // ==================================

        this.analyzer =
            options.analyzer ||
            new VocalAnalyzer();


        // ==================================
        // MEDIÇÃO ESPECTRAL REGIONAL
        // ==================================

        this.spectralRegionalMeasurement =
            options.spectralRegionalMeasurement ||
            (
                window.SpectralRegionalMeasurement
                    ? new SpectralRegionalMeasurement()
                    : null
            );


        // ==================================
        // RUNTIME ESPECTRAL REGIONAL
        // ==================================

        this.spectralRegionalRuntime =
            options.spectralRegionalRuntime ||
            (
                window.SpectralRegionalRuntime
                    ? new SpectralRegionalRuntime({
                        measurement:
                            this.spectralRegionalMeasurement
                    })
                    : null
            );


        // ==================================
        // SPECTRAL PROFILE
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

        this.spectralTreatmentBridge =
            options.spectralTreatmentBridge ||
            (
                window.SpectralTreatmentBridge
                    ? new SpectralTreatmentBridge()
                    : null
            );


        // ==================================
        // SPECTRAL DIAGNOSTIC OBSERVER
        // ==================================

        this.spectralDiagnosticObserver =
            options.spectralDiagnosticObserver ||
            (
                window.SpectralDiagnosticObserver
                    ? new SpectralDiagnosticObserver()
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


        this.lastSpectralRegionalMeasurement =
            null;


        this.lastSpectralRegionalSummary =
            null;


        this.lastSpectralProfile =
            null;


        this.lastSpectralContext =
            null;


        this.lastSpectralDiagnostic =
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
    // MEDIÇÃO ESPECTRAL REGIONAL
    // ======================================
    //
    // SOMENTE OBSERVAÇÃO.
    //
    // Nenhum parâmetro DSP é alterado.
    //
    // ======================================

    createSpectralRegionalMeasurement(
        analysis
    ) {

        if (
            !this.spectralRegionalRuntime
        ) {

            return null;
        }


        if (
            typeof this.spectralRegionalRuntime.analyze !==
            "function"
        ) {

            return null;
        }


        try {

            const result =
                this.spectralRegionalRuntime.analyze(
                    analysis
                );


            this.lastSpectralRegionalSummary =
                typeof this.spectralRegionalRuntime
                    .getLastSummary ===
                "function"

                    ? this.spectralRegionalRuntime
                        .getLastSummary()

                    : null;


            return result;

        } catch (error) {

            console.warn(
                "SpectralRegionalRuntime indisponível nesta etapa:",
                error
            );


            this.lastSpectralRegionalSummary =
                null;


            return null;
        }
    }


    // ======================================
    // GERAR PERFIL ESPECTRAL
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
    // GERAR DIAGNÓSTICO ESPECTRAL
    // ======================================
    //
    // SOMENTE OBSERVAÇÃO.
    //
    // ======================================

    createSpectralDiagnostic(
        spectralContext
    ) {

        if (
            !this.spectralDiagnosticObserver
        ) {

            return null;
        }


        if (
            typeof this.spectralDiagnosticObserver
                .observe !==
            "function"
        ) {

            return null;
        }


        try {

            return this.spectralDiagnosticObserver
                .observe(
                    spectralContext,
                    this.lastSpectralRegionalMeasurement
                );

        } catch (error) {

            console.warn(
                "SpectralDiagnosticObserver indisponível nesta etapa:",
                error
            );


            return null;
        }
    }


    // ======================================
    // GERAR PLANO DE TRATAMENTO
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
             * O contexto espectral continua
             * sendo informação de observação.
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


            /*
             * A medição regional também é
             * anexada apenas como diagnóstico.
             *
             * Ela não recebe autorização
             * para controlar o processamento.
             */

            if (
                plan &&
                this.lastSpectralRegionalMeasurement
            ) {

                plan.spectralRegionalMeasurement =
                    this.lastSpectralRegionalMeasurement;
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
        // 2. MEDIÇÃO ESPECTRAL REGIONAL
        // ==================================
        //
        // SOMENTE OBSERVAÇÃO.
        //
        // ==================================

        this.lastSpectralRegionalMeasurement =
            this.createSpectralRegionalMeasurement(
                analysis
            );


        // ==================================
        // 3. PERFIL ESPECTRAL
        // ==================================

        this.lastSpectralProfile =
            this.createSpectralProfile(
                analysis
            );


        // ==================================
        // 4. CONTEXTO ESPECTRAL
        // ==================================

        this.lastSpectralContext =
            this.createSpectralContext(
                this.lastSpectralProfile
            );


        // ==================================
        // 5. DIAGNÓSTICO ESPECTRAL
        // ==================================
        //
        // SOMENTE OBSERVAÇÃO.
        //
        // ==================================

        this.lastSpectralDiagnostic =
            this.createSpectralDiagnostic(
                this.lastSpectralContext
            );


        // ==================================
        // 6. GERAR PLANO ADAPTATIVO
        // ==================================
        //
        // O contexto espectral e a medição
        // regional são apenas anexados.
        //
        // Eles ainda NÃO controlam nenhum
        // parâmetro do processamento.
        //
        // ==================================

        this.lastTreatmentPlan =
            this.createTreatmentPlan(
                analysis,
                this.lastSpectralContext
            );


        // ==================================
        // 7. CONTEXTO OFFLINE
        // ==================================

        const context =
            new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );


        // ==================================
        // 8. SOURCE
        // ==================================

        const source =
            context.createBufferSource();


        source.buffer =
            audioBuffer;


        // ==================================
        // 9. VOCAL BODY
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
        // 10. VOCAL TONE
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
        // 11. DINÂMICA
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
        // 12. SIBILÂNCIA
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
        // 13. CONEXÃO BODY → TONE
        // ==================================

        bodyOutput.connect(
            toneInput
        );


        // ==================================
        // 14. CONEXÃO TONE → DYNAMICS
        // ==================================

        toneOutput.connect(
            compressor
        );


        // ==================================
        // 15. CONEXÃO FINAL
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
        // 16. SOURCE → BODY
        // ==================================

        source.connect(
            bodyInput
        );


        // ==================================
        // 17. INICIAR
        // ==================================

        source.start(
            0
        );


        // ==================================
        // 18. RENDER
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
    // ÚLTIMA MEDIÇÃO ESPECTRAL REGIONAL
    // ======================================

    getLastSpectralRegionalMeasurement() {

        return this.lastSpectralRegionalMeasurement;
    }


    // ======================================
    // RESUMO DA MEDIÇÃO REGIONAL
    // ======================================

    getLastSpectralRegionalSummary() {

        return this.lastSpectralRegionalSummary;
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
    // ÚLTIMO DIAGNÓSTICO ESPECTRAL
    // ======================================

    getLastSpectralDiagnostic() {

        return this.lastSpectralDiagnostic;
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