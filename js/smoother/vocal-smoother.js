// ==========================================
// SMOOTHVSTUDIO
// VOCAL SMOOTHER
// V1.5
// ==========================================
//
// Orquestrador principal do processamento.
//
// Integra:
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
// - VocalHarshness
// - VocalSibilance
// - VocalSaturation
// - VocalTreatmentPlan
// - TreatmentDecisionPipeline
// - TreatmentContractAudit
//
// CADEIA DSP:
//
// Source
//   ↓
// VocalBody
//   ↓
// VocalTone
//   ↓
// VocalDynamics
//   ↓
// VocalHarshness
//   ↓
// VocalSibilance
//   ↓
// VocalSaturation
//   ↓
// Output
//
// SpectralProfile é somente interpretativo.
// Não processa AudioBuffer.
// Não cria filtros.
// Não altera parâmetros DSP.
// ==========================================


class VocalSmoother {


    constructor(
        options = {}
    ) {

        this.version =
            "1.5";


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
        // HARSHNESS
        // ==================================

        this.harshness =
            options.harshness ||
            (
                window.VocalHarshness
                    ? new VocalHarshness()
                    : null
            );


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
        // SATURATION
        // ==================================

        this.saturation =
            options.saturation ||
            (
                window.VocalSaturation
                    ? new VocalSaturation()
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

        this.treatmentDecisionPipeline =
            options.treatmentDecisionPipeline ||
            (
                window.TreatmentDecisionPipeline
                    ? new TreatmentDecisionPipeline()
                    : null
            );


        // ==================================
        // CONTRACT AUDIT
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

        this.lastHarshnessSettings =
            null;

        this.lastSibilanceSettings =
            null;

        this.lastSaturationSettings =
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
    // RESOLVER AUDIO NODE
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

    createSpectralRegionalMeasurement(
        analysis
    ) {

        if (
            !this.spectralRegionalRuntime ||
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

        } catch (
            error
        ) {

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
            typeof window !==
            "undefined" &&
            typeof window.SmootherSpectralProfile ===
            "function"
        ) {
            
            const spectralProfileRunner =
                new window.SmootherSpectralProfile();
            
            
            const profile =
                spectralProfileRunner.analyze(
                    this.spectralProfile,
                    analysis
                );
            
            
            this.lastSpectralProfile =
                profile || null;
            
            
            return this.lastSpectralProfile;
        }
        
        
        this.lastSpectralProfile =
            null;
        
        
        return null;
    }


    // ======================================
    // CRIAR CONTEXTO ESPECTRAL
    // ======================================
    
        createSpectralContext(
        spectralProfile,
        spectralDiagnostic = null
    ) {
        
        if (
            typeof window !==
            "undefined" &&
            typeof window.SmootherSpectralContext ===
            "function"
        ) {
            
            const spectralContextRunner =
                new window.SmootherSpectralContext();
            
            
            return spectralContextRunner.create(
                this.spectralTreatmentBridge,
                spectralProfile,
                spectralDiagnostic
            );
        }
        
        
        return null;
    }
    // ======================================
    // CRIAR DIAGNÓSTICO ESPECTRAL
    // ======================================
    
    createSpectralDiagnostic(
        spectralContext
    ) {
        
        if (
            typeof window !==
            "undefined" &&
            typeof window.SmootherSpectralDiagnostic ===
            "function"
        ) {
            
            const spectralDiagnosticRunner =
                new window.SmootherSpectralDiagnostic();
            
            
            return spectralDiagnosticRunner.observe(
                this.spectralDiagnosticObserver,
                spectralContext,
                this.lastSpectralRegionalMeasurement
            );
        }
        
        
        return null;
    }


    // ======================================
    // PLANO DE TRATAMENTO
    // ======================================

    createTreatmentPlan(
        analysis,
        spectralContext = null
    ) {

        if (
            !this.treatmentPlan ||
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


            if (
                plan &&
                this.lastSpectralRegionalMeasurement
            ) {

                plan.spectralRegionalMeasurement =
                    this.lastSpectralRegionalMeasurement;
            }


            return plan;

        } catch (
            error
        ) {

            console.warn(
                "VocalTreatmentPlan indisponível nesta etapa:",
                error
            );


            return null;
        }
    }


    // ======================================
    // DECISION PIPELINE
    // ======================================
    
        createTreatmentDecisionPipeline(
        treatmentPlan
    ) {
        
        if (
            typeof window !==
            "undefined" &&
            typeof window.SmootherTreatmentDecision ===
            "function"
        ) {
            
            const treatmentDecisionRunner =
                new window.SmootherTreatmentDecision();
            
            
            return treatmentDecisionRunner.evaluate(
                this.treatmentDecisionPipeline,
                treatmentPlan
            );
        }
        
        
        return null;
    }


    // ======================================
    // SNAPSHOT DSP
    // ======================================

        createDspSnapshot() {

        if (
            typeof window !==
            "undefined" &&
            typeof window.SmootherDspSnapshot ===
            "function"
        ) {

            const snapshot =
                new window.SmootherDspSnapshot();


            return snapshot.create({

                body:
                    this.lastBodySettings,

                tone:
                    this.lastToneSettings,

                dynamics:
                    this.lastSettings,

                harshness:
                    this.lastHarshnessSettings,

                saturation:
                    this.lastSaturationSettings,

                sibilance:
                    this.lastSibilanceSettings
            });
        }


        return null;
    }


    // ======================================
    // AUDITORIA
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
        // RESET DA EXECUÇÃO
        // ==================================

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


        // ==================================
        // 1. ANALYZER
        // ==================================

        const analysis =
            this.analyzer.analyzeBuffer(
                audioBuffer
            );


        this.lastAnalysis =
            analysis;


        // ==================================
        // 2. MEDIÇÃO REGIONAL
        // ==================================

        this.lastSpectralRegionalMeasurement =
            this.createSpectralRegionalMeasurement(
                analysis
            );


        // ==================================
        // 3. SPECTRAL PROFILE
        // ==================================
        //
        // O SpectralProfile recebe somente
        // a análise produzida pelo Analyzer.
        //
        // Ele interpreta.
        // Não processa.
        // ==================================

        this.createSpectralProfile(
            analysis
        );


        // ==================================
        // OBSERVAÇÃO DO PERFIL
        // ==================================

        if (
            this.lastSpectralProfile
        ) {

            const profile =
                this.lastSpectralProfile;


            console.log(
                "[SmoothVStudio][Spectral Profile] Profile observation:",
                {

                    confidence:
                        profile.confidence ??
                        0,

                    stableBands:
                        profile.stableBands ??
                        0,

                    closestReference:
                        profile.closestReference ??
                        "unknown",

                    referenceSeparationDb:
                        profile.referenceSeparationDb ??
                        0,

                    ambiguous:
                        profile.ambiguous ??
                        true,

                    tonalTendency:
                        profile.tonalTendency ??
                        "unknown",

                    tonalConfidence:
                        profile.tonalConfidence ??
                        0,

                    spectralTilt:
                        profile.spectralTilt ??
                        null,

                    upperContentEvidence:
                        profile.upperContentEvidence ??
                        null
                }
            );

        } else {

            console.warn(
                "[SmoothVStudio][Spectral Profile] Profile unavailable."
            );
        }


        // ==================================
        // 4. CONTEXTO ESPECTRAL INICIAL
        // ==================================

        const initialSpectralContext =
            this.createSpectralContext(
                this.lastSpectralProfile
            );


        // ==================================
        // 5. DIAGNÓSTICO
        // ==================================

        this.lastSpectralDiagnostic =
            this.createSpectralDiagnostic(
                initialSpectralContext
            );


        // ==================================
        // 6. CONTEXTO ENRIQUECIDO
        // ==================================

        this.lastSpectralContext =
            this.createSpectralContext(
                this.lastSpectralProfile,
                this.lastSpectralDiagnostic
            );


        // ==================================
        // 7. TREATMENT PLAN
        // ==================================

        this.lastTreatmentPlan =
            this.createTreatmentPlan(
                analysis,
                this.lastSpectralContext
            );


        // ==================================
        // 8. DECISION PIPELINE
        // ==================================

        this.lastTreatmentDecisionPipeline =
            this.createTreatmentDecisionPipeline(
                this.lastTreatmentPlan
            );


        // ==================================
        // 9. OFFLINE CONTEXT
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
        // 11. BODY
        // ==================================

        const bodyResult =
            this.body.createProcessor(
                context,
                analysis,
                this.lastTreatmentDecisionPipeline
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
        // 12. TONE
        // ==================================

        let toneInput =
            bodyOutput;

        let toneOutput =
            bodyOutput;

        let toneActive =
            false;


        if (
            this.tone &&
            typeof this.tone.createProcessor ===
            "function"
        ) {

            const toneResult =
                this.tone.createProcessor(
                    context,
                    analysis,
                    this.lastBodySettings
                );


            this.lastToneSettings =
                toneResult.settings ||
                null;


            if (
                toneResult.input &&
                toneResult.output &&
                toneResult.input !==
                bodyOutput &&
                toneResult.output !==
                bodyOutput
            ) {

                toneInput =
                    toneResult.input;

                toneOutput =
                    toneResult.output;

                toneActive =
                    true;

            } else {

                const resolvedTone =
                    this.resolveNode(
                        toneResult
                    );


                if (
                    resolvedTone &&
                    resolvedTone !==
                    bodyOutput
                ) {

                    toneInput =
                        resolvedTone;

                    toneOutput =
                        resolvedTone;

                    toneActive =
                        true;
                }
            }
        }
                // ==================================
        // 13. DYNAMICS
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
        // 14. HARSHNESS
        // ==================================
        
        let harshnessInput =
            null;
        
        let harshnessOutput =
            compressor;
        
        let harshnessActive =
            false;
        
        
        if (
            this.harshness &&
            typeof this.harshness.createProcessor ===
            "function"
        ) {
            
            try {
                
                const harshnessResult =
                    this.harshness.createProcessor(
                        context,
                        analysis
                    );
                
                
                this.lastHarshnessSettings =
                    harshnessResult &&
                    harshnessResult.settings ?
                    harshnessResult.settings :
                    null;
                
                
                if (
                    harshnessResult &&
                    harshnessResult.input &&
                    harshnessResult.output
                ) {
                    
                    harshnessInput =
                        harshnessResult.input;
                    
                    harshnessOutput =
                        harshnessResult.output;
                    
                    harshnessActive =
                        harshnessInput !==
                        harshnessOutput;
                }
                
            } catch (
                error
            ) {
                
                console.warn(
                    "VocalHarshness indisponível nesta execução:",
                    error
                );
                
                
                this.lastHarshnessSettings =
                    null;
                
                harshnessInput =
                    null;
                
                harshnessOutput =
                    compressor;
                
                harshnessActive =
                    false;
            }
        }
        
        
        // ==================================
        // 15. SIBILANCE
        // ==================================
        
        let sibilanceInput =
            null;
        
        let sibilanceOutput =
            harshnessOutput;
        
        let sibilanceActive =
            false;
        
        
        if (
            this.sibilance &&
            typeof this.sibilance.createProcessor ===
            "function"
        ) {
            
            try {
                
                const sibilanceResult =
                    this.sibilance.createProcessor(
                        context,
                        analysis
                    );
                
                
                this.lastSibilanceSettings =
                    sibilanceResult &&
                    sibilanceResult.settings ?
                    sibilanceResult.settings :
                    null;
                
                
                sibilanceInput =
                    sibilanceResult &&
                    sibilanceResult.input ?
                    sibilanceResult.input :
                    null;
                
                
                const resolvedSibilanceOutput =
                    sibilanceResult &&
                    (
                        sibilanceResult.output ||
                        this.resolveNode(
                            sibilanceResult
                        )
                    );
                
                
                if (
                    sibilanceInput &&
                    resolvedSibilanceOutput
                ) {
                    
                    sibilanceOutput =
                        resolvedSibilanceOutput;
                    
                    sibilanceActive =
                        sibilanceInput !==
                        sibilanceOutput;
                }
                
            } catch (
                error
            ) {
                
                console.warn(
                    "VocalSibilance indisponível nesta execução:",
                    error
                );
                
                
                this.lastSibilanceSettings =
                    null;
                
                sibilanceInput =
                    null;
                
                sibilanceOutput =
                    harshnessOutput;
                
                sibilanceActive =
                    false;
            }
        }
        
        
        // ==================================
        // 16. SATURATION
        // ==================================
        
        let saturationInput =
            null;
        
        let saturationOutput =
            sibilanceOutput;
        
        let saturationActive =
            false;
        
        
        if (
            this.saturation &&
            typeof this.saturation.createProcessor ===
            "function"
        ) {
            
            try {
                
                const saturationResult =
                    this.saturation.createProcessor(
                        context,
                        analysis
                    );
                
                
                this.lastSaturationSettings =
                    saturationResult &&
                    saturationResult.settings ?
                    saturationResult.settings :
                    null;
                
                
                if (
                    saturationResult &&
                    saturationResult.input &&
                    saturationResult.output
                ) {
                    
                    saturationInput =
                        saturationResult.input;
                    
                    saturationOutput =
                        saturationResult.output;
                    
                    saturationActive =
                        saturationInput !==
                        saturationOutput;
                }
                
            } catch (
                error
            ) {
                
                console.warn(
                    "VocalSaturation indisponível nesta execução:",
                    error
                );
                
                
                this.lastSaturationSettings =
                    null;
                
                saturationInput =
                    null;
                
                saturationOutput =
                    sibilanceOutput;
                
                saturationActive =
                    false;
            }
        }
                // ==================================
        // 17. AUDITORIA OBSERVACIONAL
        // ==================================
        
        this.lastTreatmentContractAudit =
            this.createTreatmentContractAudit(
                this.lastTreatmentPlan,
                this.createDspSnapshot()
            );
        
        
        // ==================================
        // 18. BODY → TONE / DYNAMICS
        // ==================================
        
        if (
            toneActive
        ) {
            
            bodyOutput.connect(
                toneInput
            );
            
            toneOutput.connect(
                compressor
            );
            
        } else {
            
            bodyOutput.connect(
                compressor
            );
        }
        
        
        // ==================================
        // 19. DYNAMICS → HARSHNESS
        // ==================================
        
        if (
            harshnessActive
        ) {
            
            compressor.connect(
                harshnessInput
            );
        }
        
        
        // ==================================
        // 20. HARSHNESS → SIBILANCE
        // ==================================
        
        if (
            sibilanceInput
        ) {
            
            harshnessOutput.connect(
                sibilanceInput
            );
        }
        
        
        // ==================================
        // 21. SIBILANCE → SATURATION
        // ==================================
        
        if (
            saturationInput
        ) {
            
            sibilanceOutput.connect(
                saturationInput
            );
        }
        
        
        // ==================================
        // 22. SAÍDA FINAL
        // ==================================
        
        saturationOutput.connect(
            context.destination
        );
        
        
        // ==================================
        // 23. SOURCE → BODY
        // ==================================
        
        source.connect(
            bodyInput
        );
        
        
        // ==================================
        // 24. INICIAR
        // ==================================
        
        source.start(
            0
        );
        
        
        // ==================================
        // 25. RENDER
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
    // ÚLTIMA MEDIÇÃO REGIONAL
    // ======================================
    
    getLastSpectralRegionalMeasurement() {
        
        return this.lastSpectralRegionalMeasurement;
    }
    
    
    // ======================================
    // ÚLTIMO RESUMO REGIONAL
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
    // ÚLTIMO DIAGNÓSTICO
    // ======================================
    
    getLastSpectralDiagnostic() {
        
        return this.lastSpectralDiagnostic;
    }
    
    
    // ======================================
    // ÚLTIMO PLANO
    // ======================================
    
    getLastTreatmentPlan() {
        
        return this.lastTreatmentPlan;
    }
    
    
    // ======================================
    // ÚLTIMA DECISÃO
    // ======================================
    
    getLastTreatmentDecisionPipeline() {
        
        return this.lastTreatmentDecisionPipeline;
    }
    
    
    // ======================================
    // ÚLTIMA AUDITORIA
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
    // CONFIGURAÇÃO BODY
    // ======================================
    
    getLastBodySettings() {
        
        return this.lastBodySettings;
    }
    
    
    // ======================================
    // CONFIGURAÇÃO TONE
    // ======================================
    
    getLastToneSettings() {
        
        return this.lastToneSettings;
    }
    
    
    // ======================================
    // CONFIGURAÇÃO HARSHNESS
    // ======================================
    
    getLastHarshnessSettings() {
        
        return this.lastHarshnessSettings;
    }
    
    
    // ======================================
    // CONFIGURAÇÃO SIBILANCE
    // ======================================
    
    getLastSibilanceSettings() {
        
        return this.lastSibilanceSettings;
    }
    
    
    // ======================================
    // CONFIGURAÇÃO SATURATION
    // ======================================
    
    getLastSaturationSettings() {
        
        return this.lastSaturationSettings;
    }
        // ======================================
    // SNAPSHOT DSP
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