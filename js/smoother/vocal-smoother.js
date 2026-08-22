// ==========================================
// SMOOTHVSTUDIO
// VOCAL SMOOTHER
// V1.2
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
// - TreatmentDecisionPipeline
// - TreatmentContractAudit
//
// V1.2:
//
// - integração segura da medição espectral
//   regional;
// - runtime regional em modo observação;
// - perfil espectral preservado;
// - SpectralTreatmentBridge preservado;
// - diagnóstico espectral preservado;
// - plano adaptativo continua isolado do DSP;
// - TreatmentDecisionPipeline integrado em
//   modo observacional;
// - TreatmentContractAudit integrado em
//   modo observacional;
// - comparação observacional entre
//   Treatment Plan e DSP Snapshot;
// - caminho DSP anterior preservado;
// - falhas nas camadas de observação não
//   interrompem o processamento principal;
// - snapshot observacional dos parâmetros DSP
//   efetivamente calculados.
//
// IMPORTANTE:
//
// O SpectralRegionalRuntime nesta etapa atua
// somente como camada de observação.
//
// O TreatmentDecisionPipeline também atua
// somente como camada de decisão/validação.
//
// O TreatmentContractAudit atua somente
// como camada de auditoria observacional.
//
// O DSP Snapshot também atua somente como
// camada de observação.
//
// Nenhum ganho, corte, compressão,
// de-essing ou reconstrução adicional
// é aplicado por essas camadas.
//
// ==========================================


class VocalSmoother {


    constructor(
        options = {}
    ) {


        this.version =
            "1.2";


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
        // DECISION PIPELINE
        // ==================================
        //
        // SOMENTE OBSERVAÇÃO.
        //
        // O Pipeline valida:
        //
        // Treatment Plan
        //       ↓
        // Validator
        //       ↓
        // Decision Gate
        //       ↓
        // Decision Record
        //
        // Nenhuma autoridade DSP é concedida.
        //
        // ==================================

        this.treatmentDecisionPipeline =
            options.treatmentDecisionPipeline ||
            (
                window.TreatmentDecisionPipeline
                    ? new TreatmentDecisionPipeline()
                    : null
            );


        // ==================================
        // TREATMENT CONTRACT AUDIT
        // ==================================
        //
        // SOMENTE OBSERVAÇÃO.
        //
        // O Auditor compara:
        //
        // Treatment Plan
        //       ↓
        //      Audit
        //       ↑
        // DSP Snapshot
        //
        // Nenhuma autoridade DSP é concedida.
        //
        // ==================================

        this.treatmentContractAudit =
            options.treatmentContractAudit ||
            (
                window.TreatmentContractAudit
                    ? new TreatmentContractAudit()
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


        this.lastTreatmentDecisionPipeline =
            null;


        this.lastTreatmentContractAudit =
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
    //
    // O diagnóstico é opcional para manter
    // compatibilidade com a criação inicial
    // do contexto.
    //
    // Quando fornecido, o Bridge passa a
    // incorporar a interpretação regional
    // ao contexto de planejamento.
    //
    // ======================================

    createSpectralContext(
        spectralProfile,
        spectralDiagnostic = null
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
                    spectralProfile,
                    spectralDiagnostic
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
                    analysis,
                    spectralContext
                );


            /*
             * O plano agora recebe o contexto
             * DURANTE sua construção.
             *
             * Isso permite que o
             * VocalTreatmentPlan execute
             * sua própria reconciliação regional
             * com as evidências fornecidas pelo
             * SpectralTreatmentBridge.
             *
             * Nenhum parâmetro DSP é alterado.
             */


            /*
             * A medição regional continua
             * anexada apenas como evidência
             * observacional adicional.
             *
             * Ela não recebe autoridade para
             * controlar o processamento.
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
    // EXECUTAR TREATMENT DECISION PIPELINE
    // ======================================
    //
    // SOMENTE OBSERVAÇÃO.
    //
    // O resultado é armazenado para auditoria
    // e validação.
    //
    // Esta função NÃO interfere no caminho
    // de processamento de áudio.
    //
    // ======================================

    createTreatmentDecisionPipeline(
        treatmentPlan
    ) {

        if (
            !this.treatmentDecisionPipeline
        ) {

            return null;
        }


        if (
            !treatmentPlan
        ) {

            return null;
        }


        if (
            typeof this.treatmentDecisionPipeline.evaluate !==
            "function"
        ) {

            console.warn(
                "TreatmentDecisionPipeline não possui evaluate()."
            );


            return null;
        }


        try {

            const result =
                this.treatmentDecisionPipeline.evaluate(
                    treatmentPlan
                );


            /*
             * HARD LOCK LOCAL.
             *
             * Mesmo que uma camada futura
             * retorne propriedades inesperadas,
             * o VocalSmoother não converte
             * este resultado em autoridade DSP.
             */

            if (
                result &&
                typeof result ===
                "object"
            ) {

                result.processingPermission =
                    "none";


                result.audioProcessing =
                    false;


                result.reconstructionPermission =
                    "none";
            }


            return result;

        } catch (error) {

            console.warn(
                "TreatmentDecisionPipeline indisponível nesta etapa:",
                error
            );


            return null;
        }
    }


    // ======================================
    // CRIAR SNAPSHOT DSP
    // ======================================
    //
    // SOMENTE OBSERVAÇÃO.
    //
    // Este método consolida os parâmetros
    // efetivamente retornados pelos módulos
    // DSP durante a última execução.
    //
    // Não recalcula parâmetros.
    // Não altera parâmetros.
    // Não cria AudioNode.
    // Não recebe AudioBuffer.
    // Não executa processamento.
    //
    // O snapshot usa cópias rasas dos objetos
    // para evitar expor diretamente os objetos
    // internos de configuração.
    //
    // ======================================

    createDspSnapshot() {

        const copySettings =
            settings => {

                if (
                    !settings ||
                    typeof settings !==
                    "object"
                ) {

                    return null;
                }


                return {
                    ...settings
                };
            };


        return {

            version:
                "1.0",


            body:
                copySettings(
                    this.lastBodySettings
                ),


            tone:
                copySettings(
                    this.lastToneSettings
                ),


            dynamics:
                copySettings(
                    this.lastSettings
                ),


            sibilance:
                copySettings(
                    this.lastSibilanceSettings
                ),


            processingPermission:
                "none",


            audioProcessing:
                false,


            reconstructionPermission:
                "none",


            executorPermission:
                "none"
        };
    }


    // ======================================
    // AUDITAR TREATMENT PLAN ↔ DSP
    // ======================================
    //
    // SOMENTE OBSERVAÇÃO.
    //
    // Compara o plano de tratamento com
    // os parâmetros DSP efetivamente
    // armazenados durante esta execução.
    //
    // Não altera áudio.
    // Não altera parâmetros.
    // Não concede autoridade DSP.
    //
    // ======================================

    createTreatmentContractAudit(
        treatmentPlan = this.lastTreatmentPlan,
        dspSnapshot = null
    ) {

        if (
            !treatmentPlan
        ) {

            return null;
        }


        if (
            !dspSnapshot
        ) {

            dspSnapshot =
                this.createDspSnapshot();
        }


        if (
            !this.treatmentContractAudit
        ) {

            if (
                typeof window !==
                "undefined" &&
                typeof window.TreatmentContractAudit ===
                "function"
            ) {

                try {

                    this.treatmentContractAudit =
                        new TreatmentContractAudit();

                } catch (
                    error
                ) {

                    console.warn(
                        "TreatmentContractAudit indisponível nesta etapa:",
                        error
                    );


                    return null;
                }

            } else {

                return null;
            }
        }


        if (
            typeof this.treatmentContractAudit
                .auditTreatmentDspReconciliation !==
            "function"
        ) {

            console.warn(
                "TreatmentContractAudit não possui auditTreatmentDspReconciliation()."
            );


            return null;
        }


        try {

            const reconciliation =
                this.treatmentContractAudit
                    .auditTreatmentDspReconciliation(
                        treatmentPlan,
                        dspSnapshot
                    );


            return {

                version:
                    this.treatmentContractAudit.version ||
                    "0.3",

                reconciliation,

                processingPermission:
                    "none",

                audioProcessing:
                    false,

                reconstructionPermission:
                    "none",

                executorPermission:
                    "none"
            };

        } catch (
            error
        ) {

            console.warn(
                "TreatmentContractAudit indisponível nesta execução:",
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
        // 4. CONTEXTO ESPECTRAL INICIAL
        // ==================================
        //
        // Nesta primeira passagem o Bridge
        // recebe somente o perfil.
        //
        // O objetivo é produzir a base
        // espectral necessária para que o
        // Observer possa interpretar o áudio.
        //
        // ==================================

        const initialSpectralContext =
            this.createSpectralContext(
                this.lastSpectralProfile
            );


        // ==================================
        // 5. DIAGNÓSTICO ESPECTRAL
        // ==================================
        //
        // O Observer recebe:
        //
        // - contexto espectral;
        // - medição regional.
        //
        // Ele continua sendo exclusivamente
        // observacional.
        //
        // ==================================

        this.lastSpectralDiagnostic =
            this.createSpectralDiagnostic(
                initialSpectralContext
            );


        // ==================================
        // 6. CONTEXTO ESPECTRAL ENRIQUECIDO
        // ==================================
        //
        // Agora o diagnóstico volta para o
        // Bridge.
        //
        // Isso fecha o fluxo:
        //
        // Profile
        //    ↓
        // Bridge inicial
        //    ↓
        // Observer
        //    ↓
        // Bridge + diagnóstico
        //    ↓
        // Contexto de planejamento
        //
        // Nenhum DSP é executado aqui.
        //
        // ==================================

        this.lastSpectralContext =
            this.createSpectralContext(
                this.lastSpectralProfile,
                this.lastSpectralDiagnostic
            );


        // ==================================
        // 7. GERAR PLANO ADAPTATIVO
        // ==================================
        //
        // O contexto espectral enriquecido
        // agora participa da construção do
        // Treatment Plan.
        //
        // O próprio Treatment Plan decide
        // quando a evidência regional pode
        // confirmar ou reduzir uma decisão.
        //
        // A autoridade DSP continua bloqueada.
        //
        // ==================================

        this.lastTreatmentPlan =
            this.createTreatmentPlan(
                analysis,
                this.lastSpectralContext
            );


        // ==================================
        // 8. VALIDAR DECISÃO
        // ==================================
        //
        // O Treatment Decision Pipeline
        // passa a receber o plano completo.
        //
        // IMPORTANTE:
        //
        // O resultado NÃO altera o caminho DSP.
        //
        // ==================================

        this.lastTreatmentDecisionPipeline =
            this.createTreatmentDecisionPipeline(
                this.lastTreatmentPlan
            );


        // ==================================
        // 9. CONTEXTO OFFLINE
        // ==================================

        const context =
            new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );


        // ==================================
        // 10. SOURCE
        // ==================================

        const source =
            context.createBufferSource();


        source.buffer =
            audioBuffer;


        // ==================================
        // 11. VOCAL BODY
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
        // 12. VOCAL TONE
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
        // 13. DINÂMICA
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
        // 14. SIBILÂNCIA
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
        // 15. AUDITORIA OBSERVACIONAL
        // ==================================
        //
        // Neste ponto:
        //
        // - o Treatment Plan já existe;
        // - a decisão já foi avaliada;
        // - Body já calculou seus parâmetros;
        // - Tone já calculou seus parâmetros;
        // - Dynamics já calculou seus parâmetros;
        // - Sibilance já calculou seus parâmetros.
        //
        // Portanto o Auditor pode comparar
        // o plano com o snapshot desta mesma
        // execução.
        //
        // IMPORTANTE:
        //
        // A auditoria não modifica nenhum
        // parâmetro e não recebe autoridade
        // sobre o áudio.
        //
        // ==================================

        this.lastTreatmentContractAudit =
            this.createTreatmentContractAudit(
                this.lastTreatmentPlan,
                this.createDspSnapshot()
            );


        // ==================================
        // 16. CONEXÃO BODY → TONE
        // ==================================

        bodyOutput.connect(
            toneInput
        );


        // ==================================
        // 17. CONEXÃO TONE → DYNAMICS
        // ==================================

        toneOutput.connect(
            compressor
        );


        // ==================================
        // 18. CONEXÃO FINAL
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
        // 19. SOURCE → BODY
        // ==================================

        source.connect(
            bodyInput
        );


        // ==================================
        // 20. INICIAR
        // ==================================

        source.start(
            0
        );


        // ==================================
        // 21. RENDER
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
    // ÚLTIMA DECISÃO DO PIPELINE
    // ======================================

    getLastTreatmentDecisionPipeline() {

        return this.lastTreatmentDecisionPipeline;
    }


    // ======================================
    // ÚLTIMA AUDITORIA DO CONTRATO
    // ======================================
    //
    // SOMENTE OBSERVAÇÃO.
    //
    // Retorna a comparação entre o plano
    // e o snapshot DSP da última execução.
    //
    // ======================================

    getLastTreatmentContractAudit() {

        return this.lastTreatmentContractAudit;
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


    // ======================================
    // SNAPSHOT DSP DA ÚLTIMA EXECUÇÃO
    // ======================================
    //
    // SOMENTE OBSERVAÇÃO.
    //
    // Retorna uma cópia consolidada dos
    // parâmetros efetivamente armazenados
    // pelos módulos DSP.
    //
    // ======================================

    getLastDspSnapshot() {

        return this.createDspSnapshot();
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.VocalSmoother =
    VocalSmoother;