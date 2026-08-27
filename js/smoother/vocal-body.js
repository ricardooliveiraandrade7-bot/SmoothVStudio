// ==========================================
// SMOOTHVSTUDIO
// VOCAL BODY
// V0.6
// ==========================================
// Controle adaptativo de grave e médio-grave.
//
// V0.6:
//
// - preserva os cortes corretivos existentes;
// - preserva Body Recovery;
// - preserva Body Enhancement tonal;
// - preserva Body Harmonic Enhancement;
// - torna a atuação do enhancement proporcional
//   ao nível real de evidência;
// - deficiência forte → atuação completa;
// - deficiência moderada → atuação maior;
// - deficiência baixa/indeterminada → atuação média;
// - evidência contraditória → atuação mínima;
// - mantém reconstrução harmônica conservadora;
// - mantém ramo paralelo interno dedicado;
// - mantém oversampling 4x;
// - mantém o enhancement independente
//   da necessidade de corte;
// - melhora a audibilidade sem transformar
//   o módulo em excitador global;
// - registra diagnóstico explícito;
// - não cria decisões;
// - não libera processamento global;
// - não substitui o vocal original.
//
// IMPORTANTE:
//
// O Body Harmonic Enhancement é uma
// reconstrução harmônica DSP baseada em
// excitação não linear controlada.
//
// Ele NÃO recupera informação espectral
// ausente de forma literal.
//
// Ele cria componentes harmônicos
// coerentes com o conteúdo corporal
// existente no sinal.
//
// A intensidade de atuação agora considera
// explicitamente a força da evidência:
//
// forte       → atuação completa
// moderada    → atuação maior
// baixa       → atuação média
// contraditória → atuação mínima
//
// ==========================================


class VocalBody {


    constructor(options = {}) {


        this.version =
            "0.6";


        // ==================================
        // CORTES CORRETIVOS
        // ==================================

        this.maxLowCut =
            options.maxLowCut ?? -3.0;


        this.maxLowMidCut =
            options.maxLowMidCut ?? -2.5;


        this.maxMudCut =
            options.maxMudCut ?? -2.0;


        // ==================================
        // BODY RECOVERY
        // ==================================

        this.bodyRecoveryEnabled =
            options.bodyRecoveryEnabled ?? true;


        this.maxBodyRecoveryGain =
            options.maxBodyRecoveryGain ?? 0.6;


        this.bodyRecoveryQ =
            options.bodyRecoveryQ ?? 0.65;


        // ==================================
        // BODY ENHANCEMENT TONAL
        // ==================================

        this.bodyEnhancementEnabled =
            options.bodyEnhancementEnabled ?? true;


        this.maxBodyEnhancementGain =
            options.maxBodyEnhancementGain ?? 1.15;


        this.bodyEnhancementQ =
            options.bodyEnhancementQ ?? 0.65;


        // ==================================
        // BODY HARMONIC ENHANCEMENT
        // ==================================

        this.bodyHarmonicEnhancementEnabled =
            options.bodyHarmonicEnhancementEnabled ??
            true;


        this.maxBodyHarmonicDrive =
            options.maxBodyHarmonicDrive ??
            0.105;


        this.maxBodyHarmonicMix =
            options.maxBodyHarmonicMix ??
            0.20;


        this.bodyHarmonicOversample =
            "4x";


        this.bodyHarmonicQ =
            options.bodyHarmonicQ ??
            0.58;


        this.bodyHarmonicPreGain =
            options.bodyHarmonicPreGain ??
            1.55;


        this.bodyHarmonicPostGain =
            options.bodyHarmonicPostGain ??
            0.88;


        // ==================================
        // FAIXA DO EXCITADOR CORPORAL
        // ==================================

        this.bodyHarmonicMinFrequency =
            options.bodyHarmonicMinFrequency ??
            150;


        this.bodyHarmonicMaxFrequency =
            options.bodyHarmonicMaxFrequency ??
            520;


        this.bodyHarmonicOutputMinFrequency =
            options.bodyHarmonicOutputMinFrequency ??
            180;


        this.bodyHarmonicOutputMaxFrequency =
            options.bodyHarmonicOutputMaxFrequency ??
            1800;


        // ==================================
        // REFERÊNCIAS DE DEFICIÊNCIA
        // ==================================

        this.bodyReferenceRatio =
            options.bodyReferenceRatio ??
            0.18;


        this.localBodyReferenceRatio =
            options.localBodyReferenceRatio ??
            0.38;


        // ==================================
        // INTEGRAÇÃO COM DECISÃO
        // ==================================

        this.decisionIntegrationEnabled =
            options.decisionIntegrationEnabled ??
            true;


        this.maxDecisionLowCut =
            options.maxDecisionLowCut ??
            -1.0;


        this.minDecisionConfidence =
            options.minDecisionConfidence ??
            "moderate";


        // ==================================
        // DIAGNÓSTICO
        // ==================================

        this.lastSettings =
            null;


        this.lastHarmonicStatus =
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
    // NÚMERO SEGURO
    // ======================================

    safeNumber(
        value,
        fallback = 0
    ) {

        return Number.isFinite(
            value
        )
            ? value
            : fallback;
    }


    // ======================================
    // RANK DE CONFIANÇA
    // ======================================

    confidenceRank(
        value
    ) {

        const text =
            String(
                value || ""
            ).toLowerCase();


        if (
            text === "strong" ||
            text === "forte"
        ) {

            return 2;
        }


        if (
            text === "moderate" ||
            text === "moderada"
        ) {

            return 1;
        }


        return 0;
    }


    // ======================================
    // IDENTIFICAR REGIÃO LOW
    // ======================================

    isLowRegion(
        region
    ) {

        if (!region) {

            return false;
        }


        const id =
            String(
                region.id ||
                region.key ||
                region.name ||
                ""
            ).toLowerCase();


        return (
            id === "body" ||
            id === "bass" ||
            id === "grave" ||
            id === "low" ||
            id === "low-body" ||
            id === "lowbody"
        );
    }


    // ======================================
    // IDENTIFICAR CORREÇÃO
    // ======================================

    isCorrectionTreatment(
        intent
    ) {

        const type =
            String(
                intent &&
                (
                    intent.treatmentType ||
                    intent.treatment ||
                    intent.actionType ||
                    ""
                )
            ).toLowerCase();


        return (
            type.includes("correct") ||
            type.includes("correction") ||
            type.includes("reduce") ||
            type.includes("cut") ||
            type.includes("atten") ||
            type.includes("correção") ||
            type.includes("redução") ||
            type.includes("corte")
        );
    }
        // ======================================
    // LER CORTE DA DECISÃO
    // ======================================

    getDecisionLowCut(
        decision
    ) {

        if (
            !this.decisionIntegrationEnabled ||
            !decision ||
            !Array.isArray(
                decision.regionalInterventionIntent
            )
        ) {

            return 0;
        }


        let requestedCut =
            0;


        for (
            const intent of
            decision.regionalInterventionIntent
        ) {

            if (
                !intent ||
                intent.state !==
                "candidate"
            ) {

                continue;
            }


            if (
                !this.isLowRegion(
                    intent.region
                )
            ) {

                continue;
            }


            if (
                !this.isCorrectionTreatment(
                    intent
                )
            ) {

                continue;
            }


            const confidence =
                this.confidenceRank(
                    intent.confidence
                );


            if (
                confidence <
                this.confidenceRank(
                    this.minDecisionConfidence
                )
            ) {

                continue;
            }


            const boundedGain =
                Number(
                    intent.boundedGainDb
                );


            if (
                !Number.isFinite(
                    boundedGain
                )
            ) {

                continue;
            }


            const cut =
                Math.min(
                    0,
                    boundedGain
                );


            requestedCut =
                Math.min(
                    requestedCut,
                    cut
                );
        }


        return this.clamp(
            requestedCut * 0.5,
            this.maxDecisionLowCut,
            0
        );
    }


    // ======================================
    // MEDIR DEFICIÊNCIA DE CORPO
    // ======================================

    calculateBodyDeficiency(
        globalBodyRatio,
        bodyRatio
    ) {

        const globalDeficiency =
            this.clamp(
                (
                    this.bodyReferenceRatio -
                    globalBodyRatio
                ) /
                this.bodyReferenceRatio,
                0,
                1
            );


        const localDeficiency =
            this.clamp(
                (
                    this.localBodyReferenceRatio -
                    bodyRatio
                ) /
                this.localBodyReferenceRatio,
                0,
                1
            );


        return this.clamp(
            (
                globalDeficiency *
                0.60
            ) +
            (
                localDeficiency *
                0.40
            ),
            0,
            1
        );
    }


    // ======================================
    // CONFIANÇA DO ENHANCEMENT
    // ======================================

    calculateEnhancementConfidence(
        bodyDeficiency,
        correctionConfidence,
        bodyRatio,
        globalBodyRatio
    ) {

        const deficiencyEvidence =
            this.clamp(
                bodyDeficiency,
                0,
                1
            );


        const localEvidence =
            this.clamp(
                (
                    (
                        this.localBodyReferenceRatio -
                        bodyRatio
                    ) /
                    this.localBodyReferenceRatio
                ),
                0,
                1
            );


        const globalEvidence =
            this.clamp(
                (
                    (
                        this.bodyReferenceRatio -
                        globalBodyRatio
                    ) /
                    this.bodyReferenceRatio
                ),
                0,
                1
            );


        const combinedEvidence =
            this.clamp(
                (
                    deficiencyEvidence *
                    0.50
                ) +
                (
                    localEvidence *
                    0.25
                ) +
                (
                    globalEvidence *
                    0.25
                ),
                0,
                1
            );


        return this.clamp(
            (
                combinedEvidence *
                0.75
            ) +
            (
                correctionConfidence *
                0.25
            ),
            0,
            1
        );
    }


    // ======================================
    // CLASSIFICAR EVIDÊNCIA
    // ======================================
    //
    // A classificação não cria uma decisão
    // externa.
    //
    // Ela apenas converte a evidência já
    // medida em uma intensidade interna
    // de atuação.
    //
    // ======================================

    classifyBodyEvidence(
        bodyDeficiency,
        enhancementConfidence,
        correctionConfidence
    ) {

        const deficiency =
            this.clamp(
                this.safeNumber(
                    bodyDeficiency,
                    0
                ),
                0,
                1
            );


        const confidence =
            this.clamp(
                this.safeNumber(
                    enhancementConfidence,
                    0
                ),
                0,
                1
            );


        const correction =
            this.clamp(
                this.safeNumber(
                    correctionConfidence,
                    0
                ),
                0,
                1
            );


        // ==================================
        // EVIDÊNCIA CONTRADITÓRIA
        // ==================================
        //
        // Existe uma deficiência aparente,
        // porém a confiança geral é baixa.
        //
        // Nesse cenário preservamos o sinal
        // e permitimos somente uma atuação
        // residual.
        //
        // ==================================

        if (
            deficiency >= 0.35 &&
            confidence < 0.20
        ) {

            return {
                level:
                    "contradictory",

                label:
                    "contradictory",

                strength:
                    0.18,

                deficiency,

                confidence,

                correctionConfidence:
                    correction
            };
        }


        // ==================================
        // EVIDÊNCIA FORTE
        // ==================================

        if (
            deficiency >= 0.65 &&
            confidence >= 0.60
        ) {

            return {
                level:
                    "strong",

                label:
                    "strong",

                strength:
                    1.00,

                deficiency,

                confidence,

                correctionConfidence:
                    correction
            };
        }


        // ==================================
        // EVIDÊNCIA MODERADA
        // ==================================

        if (
            deficiency >= 0.35 &&
            confidence >= 0.35
        ) {

            return {
                level:
                    "moderate",

                label:
                    "moderate",

                strength:
                    0.78,

                deficiency,

                confidence,

                correctionConfidence:
                    correction
            };
        }


        // ==================================
        // EVIDÊNCIA BAIXA / INDETERMINADA
        // ==================================
        //
        // Mesmo com pouca evidência,
        // a atuação não é mais praticamente
        // nula.
        //
        // O módulo pode testar uma reconstrução
        // média, mas continua limitado.
        //
        // ==================================

        return {
            level:
                "low",

            label:
                "low",

            strength:
                0.52,

            deficiency,

            confidence,

            correctionConfidence:
                correction
        };
    }
        // ======================================
    // DEMANDA HARMÔNICA
    // ======================================
    //
    // A demanda representa a necessidade
    // estimada de reconstrução.
    //
    // A intensidade final é posteriormente
    // modulada pela classificação da evidência.
    //
    // ======================================

    calculateHarmonicDemand(
        bodyDeficiency,
        enhancementConfidence
    ) {

        const deficiency =
            this.clamp(
                bodyDeficiency,
                0,
                1
            );


        const confidence =
            this.clamp(
                enhancementConfidence,
                0,
                1
            );


        const demand =
            this.clamp(
                (
                    Math.pow(
                        deficiency,
                        0.72
                    ) *
                    0.72
                ) +
                (
                    confidence *
                    0.28
                ),
                0,
                1
            );


        return demand;
    }


    // ======================================
    // CRIAR CURVA HARMÔNICA
    // ======================================

    createHarmonicCurve(
        drive = 0.08
    ) {

        const samples =
            2048;


        const curve =
            new Float32Array(
                samples
            );


        const safeDrive =
            this.clamp(
                drive,
                0,
                this.maxBodyHarmonicDrive
            );


        const evenAmount =
            safeDrive *
            1.55;


        const oddAmount =
            safeDrive *
            0.55;


        const normalization =
            1 +
            (
                evenAmount *
                0.28
            ) +
            (
                oddAmount *
                0.16
            );


        for (
            let i = 0;
            i < samples;
            i++
        ) {

            const x =
                (
                    (
                        i /
                        (
                            samples -
                            1
                        )
                    ) *
                    2
                ) -
                1;


            const shaped =
                x +
                (
                    evenAmount *
                    x *
                    x *
                    0.34
                ) +
                (
                    oddAmount *
                    x *
                    x *
                    x *
                    0.18
                );


            curve[i] =
                this.clamp(
                    shaped /
                    normalization,
                    -1,
                    1
                );
        }


        return curve;
    }


    // ======================================
    // CRIAR WAVESHAPER HARMÔNICO
    // ======================================

    createHarmonicShaper(
        context,
        drive
    ) {

        const shaper =
            context.createWaveShaper();


        shaper.curve =
            this.createHarmonicCurve(
                drive
            );


        shaper.oversample =
            this.bodyHarmonicOversample;


        return shaper;
    }


    // ======================================
    // CRIAR FILTRO PEAKING
    // ======================================

    createPeakingFilter(
        context,
        frequency,
        Q,
        gain
    ) {

        const filter =
            context.createBiquadFilter();


        filter.type =
            "peaking";


        filter.frequency.value =
            frequency;


        filter.Q.value =
            Q;


        filter.gain.value =
            gain;


        return filter;
    }


    // ======================================
    // CRIAR FILTRO BANDPASS
    // ======================================

    createBodyBandpass(
        context,
        minFrequency,
        maxFrequency
    ) {

        const filter =
            context.createBiquadFilter();


        filter.type =
            "bandpass";


        const center =
            Math.sqrt(
                minFrequency *
                maxFrequency
            );


        const bandwidth =
            Math.log2(
                maxFrequency /
                minFrequency
            );


        filter.frequency.value =
            this.clamp(
                center,
                20,
                context.sampleRate *
                0.46
            );


        filter.Q.value =
            this.clamp(
                1 /
                bandwidth,
                0.25,
                1.10
            );


        return filter;
    }


    // ======================================
    // CRIAR FILTRO LOWPASS
    // ======================================

    createBodyHarmonicLowpass(
        context
    ) {

        const filter =
            context.createBiquadFilter();


        filter.type =
            "lowpass";


        filter.frequency.value =
            Math.min(
                this.bodyHarmonicOutputMaxFrequency,
                context.sampleRate *
                0.42
            );


        filter.Q.value =
            0.42;


        return filter;
    }
        // ======================================
    // CALCULAR GANHO HARMÔNICO
    // ======================================

    calculateHarmonicSettings(
        bodyDeficiency,
        enhancementConfidence,
        correctionConfidence = 0
    ) {

        const demand =
            this.calculateHarmonicDemand(
                bodyDeficiency,
                enhancementConfidence
            );


        const evidence =
            this.classifyBodyEvidence(
                bodyDeficiency,
                enhancementConfidence,
                correctionConfidence
            );


        // ==================================
        // DEMANDA AJUSTADA PELA EVIDÊNCIA
        // ==================================
        //
        // Aqui ocorre a principal mudança
        // comportamental da V0.6.
        //
        // A demanda continua representando
        // a necessidade medida.
        //
        // A strength representa quanto dessa
        // necessidade pode realmente se tornar
        // processamento.
        //
        // ==================================

        const effectiveDemand =
            this.clamp(
                demand *
                evidence.strength,
                0,
                1
            );


        const drive =
            this.bodyHarmonicEnhancementEnabled
                ? this.clamp(
                    effectiveDemand *
                    this.maxBodyHarmonicDrive,
                    0,
                    this.maxBodyHarmonicDrive
                )
                : 0;


        const mix =
            this.bodyHarmonicEnhancementEnabled
                ? this.clamp(
                    effectiveDemand *
                    this.maxBodyHarmonicMix,
                    0,
                    this.maxBodyHarmonicMix
                )
                : 0;


        return {

            demand,

            effectiveDemand,

            evidenceLevel:
                evidence.level,

            evidenceStrength:
                evidence.strength,

            drive,

            mix,

            enabled:
                this.bodyHarmonicEnhancementEnabled &&
                drive > 0 &&
                mix > 0,

            oversample:
                this.bodyHarmonicOversample
        };
    }


    // ======================================
    // CALCULAR GANHO TONAL
    // ======================================
    //
    // A mesma filosofia é aplicada ao
    // enhancement tonal.
    //
    // Não basta detectar deficiência:
    // a confiança determina a intensidade.
    //
    // ======================================

    calculateBodyEnhancementGain(
        bodyDeficiency,
        enhancementConfidence,
        correctionConfidence
    ) {

        if (
            !this.bodyEnhancementEnabled
        ) {

            return 0;
        }


        const evidence =
            this.classifyBodyEvidence(
                bodyDeficiency,
                enhancementConfidence,
                correctionConfidence
            );


        const demand =
            this.clamp(
                bodyDeficiency *
                enhancementConfidence,
                0,
                1
            );


        return this.clamp(
            demand *
            evidence.strength *
            this.maxBodyEnhancementGain,
            0,
            this.maxBodyEnhancementGain
        );
    }


    // ======================================
    // DIAGNÓSTICO HARMÔNICO
    // ======================================

    logHarmonicObservation(
        settings
    ) {

        const harmonic =
            settings.harmonic;


        const observation = {

            version:
                this.version,

            enabled:
                harmonic.enabled,

            bodyDeficiency:
                Number(
                    settings.bodyDeficiency
                    .toFixed(4)
                ),

            enhancementConfidence:
                Number(
                    settings.enhancementConfidence
                    .toFixed(4)
                ),

            evidenceLevel:
                harmonic.evidenceLevel,

            evidenceStrength:
                Number(
                    harmonic.evidenceStrength
                    .toFixed(4)
                ),

            demand:
                Number(
                    harmonic.demand
                    .toFixed(4)
                ),

            effectiveDemand:
                Number(
                    harmonic.effectiveDemand
                    .toFixed(4)
                ),

            drive:
                Number(
                    harmonic.drive
                    .toFixed(4)
                ),

            mix:
                Number(
                    harmonic.mix
                    .toFixed(4)
                ),

            oversample:
                harmonic.oversample,

            frequencyRange: {

                inputMin:
                    this.bodyHarmonicMinFrequency,

                inputMax:
                    this.bodyHarmonicMaxFrequency,

                outputMin:
                    this.bodyHarmonicOutputMinFrequency,

                outputMax:
                    this.bodyHarmonicOutputMaxFrequency
            },

            mode:
                harmonic.enabled
                    ? "harmonic-enhancement"
                    : "preserve"
        };


        this.lastHarmonicStatus =
            observation;


        if (
            typeof console !==
            "undefined" &&
            typeof console.log ===
            "function"
        ) {

            console.log(
                "[SmoothVStudio][VocalBody] Harmonic enhancement observation:",
                observation
            );
        }
    }
        // ======================================
    // CONFIGURAÇÃO PRINCIPAL
    // ======================================

    calculateSettings(
        analysis,
        treatmentDecision = null
    ) {

        if (!analysis) {

            throw new Error(
                "Análise vocal não disponível."
            );
        }


        const bands =
            analysis.bands || {};


        const ratios =
            analysis.ratios || {};


        const body =
            this.safeNumber(
                bands.body,
                0
            );


        const lowMid =
            this.safeNumber(
                bands.lowMid,
                0
            );


        const mid =
            this.safeNumber(
                bands.mid,
                0
            );


        const total =
            body +
            lowMid +
            mid +
            0.000001;


        const bodyRatio =
            body /
            total;


        const lowMidRatio =
            lowMid /
            total;


        const midRatio =
            mid /
            total;


        const globalBodyRatio =
            this.safeNumber(
                ratios.body,
                0
            );


        // ==================================
        // EXCESSO LOW
        // ==================================

        const globalLowExcess =
            this.clamp(
                (
                    globalBodyRatio -
                    this.bodyReferenceRatio
                ) /
                this.bodyReferenceRatio,
                0,
                1
            );


        const localBodyExcess =
            this.clamp(
                (
                    bodyRatio -
                    this.localBodyReferenceRatio
                ) /
                0.22,
                0,
                1
            );


        const lowExcess =
            this.clamp(
                (
                    globalLowExcess *
                    0.55
                ) +
                (
                    localBodyExcess *
                    0.45
                ),
                0,
                1
            );


        // ==================================
        // EXCESSO LOW-MID
        // ==================================

        const lowMidExcess =
            this.clamp(
                (
                    lowMidRatio -
                    0.30
                ) /
                0.22,
                0,
                1
            );


        const lowMidMidBalance =
            (
                lowMidRatio *
                0.62
            ) +
            (
                midRatio *
                0.38
            );


        const congestion =
            this.clamp(
                (
                    lowMidMidBalance -
                    0.37
                ) /
                0.28,
                0,
                1
            );


        // ==================================
        // DOMINÂNCIA LOW-MID
        // ==================================

        const lowMidDominance =
            this.clamp(
                (
                    (
                        body +
                        lowMid
                    ) /
                    (
                        mid +
                        body +
                        lowMid +
                        0.000001
                    )
                ) -
                0.48,
                0,
                0.40
            ) /
            0.40;


        const correctionConfidence =
            this.clamp(
                (
                    lowMidDominance *
                    0.60
                ) +
                (
                    congestion *
                    0.40
                ),
                0,
                1
            );


        // ==================================
        // CORREÇÃO AUTOMÁTICA
        // ==================================

        const automaticLowGain =
            this.clamp(
                (
                    lowExcess *
                    correctionConfidence
                ) *
                this.maxLowCut,
                this.maxLowCut,
                0
            );


        const decisionLowCut =
            this.getDecisionLowCut(
                treatmentDecision
            );


        const lowGain =
            this.clamp(
                automaticLowGain +
                decisionLowCut,
                this.maxLowCut,
                0
            );


        const lowMidGain =
            this.clamp(
                (
                    lowMidExcess *
                    correctionConfidence
                ) *
                this.maxLowMidCut,
                this.maxLowMidCut,
                0
            );


        const mudGain =
            this.clamp(
                (
                    congestion *
                    correctionConfidence
                ) *
                this.maxMudCut,
                this.maxMudCut,
                0
            );


        // ==================================
        // FREQUÊNCIAS CORRETIVAS
        // ==================================

        const lowFrequency =
            this.clamp(
                175 +
                (
                    lowExcess *
                    75
                ),
                175,
                250
            );


        const lowMidFrequency =
            this.clamp(
                350 +
                (
                    lowMidExcess *
                    120
                ),
                350,
                470
            );


        const mudFrequency =
            this.clamp(
                630 +
                (
                    congestion *
                    210
                ),
                630,
                840
            );


        const intensity =
            this.clamp(
                (
                    lowExcess *
                    0.35
                ) +
                (
                    lowMidExcess *
                    0.40
                ) +
                (
                    congestion *
                    0.25
                ),
                0,
                1
            );


        // ==================================
        // DEFICIÊNCIA DE CORPO
        // ==================================

        const bodyDeficiency =
            this.calculateBodyDeficiency(
                globalBodyRatio,
                bodyRatio
            );


        const enhancementConfidence =
            this.calculateEnhancementConfidence(
                bodyDeficiency,
                correctionConfidence,
                bodyRatio,
                globalBodyRatio
            );


        // ==================================
        // CLASSIFICAÇÃO DA EVIDÊNCIA
        // ==================================

        const bodyEvidence =
            this.classifyBodyEvidence(
                bodyDeficiency,
                enhancementConfidence,
                correctionConfidence
            );


        // ==================================
        // ENHANCEMENT TONAL
        // ==================================

        const enhancementDemand =
            this.clamp(
                (
                    bodyDeficiency *
                    enhancementConfidence
                ),
                0,
                1
            );


        const bodyEnhancementGain =
            this.calculateBodyEnhancementGain(
                bodyDeficiency,
                enhancementConfidence,
                correctionConfidence
            );


        const enhancementFrequency =
            this.clamp(
                250 +
                (
                    bodyDeficiency *
                    110
                ),
                250,
                360
            );


        // ==================================
        // BODY RECOVERY
        // ==================================

        const totalAttenuation =
            Math.abs(
                lowGain
            ) +
            Math.abs(
                lowMidGain
            ) +
            Math.abs(
                mudGain
            );


        const recoveryDemand =
            this.clamp(
                totalAttenuation /
                5.5,
                0,
                1
            );


        const bodyRecoveryGain =
            this.bodyRecoveryEnabled
                ? this.clamp(
                    recoveryDemand *
                    this.maxBodyRecoveryGain,
                    0,
                    this.maxBodyRecoveryGain
                )
                : 0;


        const recoveryFrequency =
            this.clamp(
                (
                    (
                        lowFrequency *
                        0.35
                    ) +
                    (
                        lowMidFrequency *
                        0.45
                    ) +
                    (
                        mudFrequency *
                        0.20
                    )
                ),
                260,
                520
            );
                    // ==================================
        // HARMONIC ENHANCEMENT
        // ==================================

        const harmonic =
            this.calculateHarmonicSettings(
                bodyDeficiency,
                enhancementConfidence,
                correctionConfidence
            );


        // ==================================
        // CONFIGURAÇÕES FINAIS
        // ==================================

        const settings = {

            version:
                this.version,

            lowGain,

            lowMidGain,

            mudGain,

            lowFrequency,

            lowMidFrequency,

            mudFrequency,

            intensity,

            lowExcess,

            lowMidExcess,

            congestion,

            correctionConfidence,

            automaticLowGain,

            decisionLowCut,

            bodyRatio,

            globalBodyRatio,

            bodyDeficiency,

            enhancementConfidence,

            enhancementDemand,

            bodyEvidence,

            bodyEnhancementGain,

            enhancementFrequency,

            bodyEnhancementQ:
                this.bodyEnhancementQ,

            bodyRecoveryGain,

            recoveryFrequency,

            bodyRecoveryQ:
                this.bodyRecoveryQ,

            harmonic
        };


        this.lastSettings =
            settings;


        return settings;
    }


    // ======================================
    // CRIAR PROCESSADOR
    // ======================================

    createProcessor(
        context,
        analysis,
        treatmentDecision = null
    ) {

        if (!context) {

            throw new Error(
                "AudioContext inválido."
            );
        }


        if (
            typeof context.createGain !==
            "function"
        ) {

            throw new Error(
                "Contexto de áudio inválido para VocalBody."
            );
        }


        const settings =
            this.calculateSettings(
                analysis,
                treatmentDecision
            );


        // ==================================
        // ENTRADA DO MÓDULO
        // ==================================

        const input =
            context.createGain();


        input.gain.value =
            1;


        // ==================================
        // LOW
        // ==================================

        const lowFilter =
            this.createPeakingFilter(
                context,
                settings.lowFrequency,
                0.70,
                settings.lowGain
            );


        // ==================================
        // LOW-MID
        // ==================================

        const lowMidFilter =
            this.createPeakingFilter(
                context,
                settings.lowMidFrequency,
                0.85,
                settings.lowMidGain
            );


        // ==================================
        // MUD
        // ==================================

        const mudFilter =
            this.createPeakingFilter(
                context,
                settings.mudFrequency,
                0.90,
                settings.mudGain
            );


        // ==================================
        // BODY ENHANCEMENT TONAL
        // ==================================

        const bodyEnhancementFilter =
            this.createPeakingFilter(
                context,
                settings.enhancementFrequency,
                settings.bodyEnhancementQ,
                settings.bodyEnhancementGain
            );


        // ==================================
        // BODY RECOVERY
        // ==================================

        const bodyRecoveryFilter =
            this.createPeakingFilter(
                context,
                settings.recoveryFrequency,
                settings.bodyRecoveryQ,
                settings.bodyRecoveryGain
            );


        // ==================================
        // BARRAMENTO PRINCIPAL
        // ==================================

        const mainOutput =
            context.createGain();


        mainOutput.gain.value =
            1;


        // ==================================
        // CONEXÃO PRINCIPAL
        // ==================================

        input.connect(
            lowFilter
        );


        lowFilter.connect(
            lowMidFilter
        );


        lowMidFilter.connect(
            mudFilter
        );


        mudFilter.connect(
            bodyEnhancementFilter
        );


        bodyEnhancementFilter.connect(
            bodyRecoveryFilter
        );


        bodyRecoveryFilter.connect(
            mainOutput
        );


        // ==================================
        // RAMO HARMÔNICO CORPORAL
        // ==================================

        const harmonicInputGain =
            context.createGain();


        harmonicInputGain.gain.value =
            this.bodyHarmonicPreGain;


        const harmonicBandpass =
            this.createBodyBandpass(
                context,
                this.bodyHarmonicMinFrequency,
                this.bodyHarmonicMaxFrequency
            );


        const harmonicShaper =
            this.createHarmonicShaper(
                context,
                settings.harmonic.drive
            );


        const harmonicLowpass =
            this.createBodyHarmonicLowpass(
                context
            );


        const harmonicOutputGain =
            context.createGain();


        harmonicOutputGain.gain.value =
            settings.harmonic.mix *
            this.bodyHarmonicPostGain;


        input.connect(
            harmonicInputGain
        );


        harmonicInputGain.connect(
            harmonicBandpass
        );


        harmonicBandpass.connect(
            harmonicShaper
        );


        harmonicShaper.connect(
            harmonicLowpass
        );


        harmonicLowpass.connect(
            harmonicOutputGain
        );


        // ==================================
        // SOMA
        // ==================================

        harmonicOutputGain.connect(
            mainOutput
        );


        // ==================================
        // DIAGNÓSTICO
        // ==================================

        this.logHarmonicObservation(
            settings
        );


        const processorObservation = {

            version:
                this.version,

            bodyEnhancement: {

                enabled:
                    this.bodyEnhancementEnabled,

                gainDb:
                    settings.bodyEnhancementGain,

                frequency:
                    settings.enhancementFrequency,

                Q:
                    settings.bodyEnhancementQ
            },

            harmonicEnhancement: {

                enabled:
                    settings.harmonic.enabled,

                evidenceLevel:
                    settings.harmonic.evidenceLevel,

                evidenceStrength:
                    settings.harmonic.evidenceStrength,

                demand:
                    settings.harmonic.demand,

                effectiveDemand:
                    settings.harmonic.effectiveDemand,

                drive:
                    settings.harmonic.drive,

                mix:
                    settings.harmonic.mix,

                oversample:
                    settings.harmonic.oversample
            },

            recovery: {

                enabled:
                    this.bodyRecoveryEnabled,

                gainDb:
                    settings.bodyRecoveryGain,

                frequency:
                    settings.recoveryFrequency
            }
        };


        if (
            typeof console !==
            "undefined" &&
            typeof console.log ===
            "function"
        ) {

            console.log(
                "[SmoothVStudio][VocalBody] Processor observation:",
                processorObservation
            );
        }
                return {

            input,

            output:
                mainOutput,

            settings,

            harmonic: {

                input:
                    harmonicInputGain,

                bandpass:
                    harmonicBandpass,

                shaper:
                    harmonicShaper,

                lowpass:
                    harmonicLowpass,

                output:
                    harmonicOutputGain
            },

            main: {

                low:
                    lowFilter,

                lowMid:
                    lowMidFilter,

                mud:
                    mudFilter,

                enhancement:
                    bodyEnhancementFilter,

                recovery:
                    bodyRecoveryFilter,

                output:
                    mainOutput
            }
        };
    }


    // ======================================
    // DIAGNÓSTICO
    // ======================================

    getDiagnosticSnapshot(
        analysis = null,
        treatmentDecision = null
    ) {

        if (!analysis) {

            return {

                version:
                    this.version,

                bodyEnhancementEnabled:
                    this.bodyEnhancementEnabled,

                bodyRecoveryEnabled:
                    this.bodyRecoveryEnabled,

                bodyHarmonicEnhancementEnabled:
                    this.bodyHarmonicEnhancementEnabled,

                maxBodyEnhancementGain:
                    this.maxBodyEnhancementGain,

                maxBodyRecoveryGain:
                    this.maxBodyRecoveryGain,

                maxBodyHarmonicDrive:
                    this.maxBodyHarmonicDrive,

                maxBodyHarmonicMix:
                    this.maxBodyHarmonicMix,

                bodyHarmonicOversample:
                    this.bodyHarmonicOversample
            };
        }


        const settings =
            this.calculateSettings(
                analysis,
                treatmentDecision
            );


        return {

            version:
                this.version,

            settings,

            bodyEnhancementEnabled:
                this.bodyEnhancementEnabled,

            bodyRecoveryEnabled:
                this.bodyRecoveryEnabled,

            bodyHarmonicEnhancementEnabled:
                this.bodyHarmonicEnhancementEnabled,

            maxBodyEnhancementGain:
                this.maxBodyEnhancementGain,

            maxBodyRecoveryGain:
                this.maxBodyRecoveryGain,

            maxBodyHarmonicDrive:
                this.maxBodyHarmonicDrive,

            maxBodyHarmonicMix:
                this.maxBodyHarmonicMix,

            bodyEnhancementQ:
                this.bodyEnhancementQ,

            bodyRecoveryQ:
                this.bodyRecoveryQ,

            bodyHarmonicQ:
                this.bodyHarmonicQ,

            bodyHarmonicOversample:
                this.bodyHarmonicOversample,

            lastHarmonicStatus:
                this.lastHarmonicStatus
        };
    }


    // ======================================
    // CONFIGURAÇÃO DO ENHANCEMENT
    // ======================================

    setBodyEnhancement(
        options = {}
    ) {

        if (
            typeof options.enabled ===
            "boolean"
        ) {

            this.bodyEnhancementEnabled =
                options.enabled;
        }


        if (
            Number.isFinite(
                options.maxGain
            )
        ) {

            this.maxBodyEnhancementGain =
                this.clamp(
                    options.maxGain,
                    0,
                    3
                );
        }


        if (
            Number.isFinite(
                options.Q
            )
        ) {

            this.bodyEnhancementQ =
                this.clamp(
                    options.Q,
                    0.20,
                    1.40
                );
        }


        return true;
    }


    // ======================================
    // CONFIGURAÇÃO DO HARMONIC ENHANCEMENT
    // ======================================

    setBodyHarmonicEnhancement(
        options = {}
    ) {

        if (
            typeof options.enabled ===
            "boolean"
        ) {

            this.bodyHarmonicEnhancementEnabled =
                options.enabled;
        }


        if (
            Number.isFinite(
                options.maxDrive
            )
        ) {

            this.maxBodyHarmonicDrive =
                this.clamp(
                    options.maxDrive,
                    0,
                    0.30
                );
        }


        if (
            Number.isFinite(
                options.maxMix
            )
        ) {

            this.maxBodyHarmonicMix =
                this.clamp(
                    options.maxMix,
                    0,
                    0.40
                );
        }


        if (
            Number.isFinite(
                options.preGain
            )
        ) {

            this.bodyHarmonicPreGain =
                this.clamp(
                    options.preGain,
                    1,
                    3
                );
        }


        if (
            Number.isFinite(
                options.postGain
            )
        ) {

            this.bodyHarmonicPostGain =
                this.clamp(
                    options.postGain,
                    0,
                    2
                );
        }


        return true;
    }
        // ======================================
    // CONFIGURAÇÃO DA RECUPERAÇÃO
    // ======================================

    setBodyRecovery(
        options = {}
    ) {

        if (
            typeof options.enabled ===
            "boolean"
        ) {

            this.bodyRecoveryEnabled =
                options.enabled;
        }


        if (
            Number.isFinite(
                options.maxGain
            )
        ) {

            this.maxBodyRecoveryGain =
                this.clamp(
                    options.maxGain,
                    0,
                    2
                );
        }


        if (
            Number.isFinite(
                options.Q
            )
        ) {

            this.bodyRecoveryQ =
                this.clamp(
                    options.Q,
                    0.20,
                    1.40
                );
        }


        return true;
    }


    // ======================================
    // MODO CONSERVADOR
    // ======================================

    setConservativeMode() {

        this.maxLowCut =
            -3.0;


        this.maxLowMidCut =
            -2.5;


        this.maxMudCut =
            -2.0;


        this.bodyRecoveryEnabled =
            true;


        this.maxBodyRecoveryGain =
            0.45;


        this.bodyRecoveryQ =
            0.70;


        this.bodyEnhancementEnabled =
            true;


        this.maxBodyEnhancementGain =
            0.75;


        this.bodyEnhancementQ =
            0.70;


        this.bodyHarmonicEnhancementEnabled =
            true;


        this.maxBodyHarmonicDrive =
            0.060;


        this.maxBodyHarmonicMix =
            0.10;


        this.bodyHarmonicPreGain =
            1.35;


        this.bodyHarmonicPostGain =
            0.85;


        this.bodyHarmonicQ =
            0.65;
    }


    // ======================================
    // MODO PADRÃO
    // ======================================

    setDefaultMode() {

        this.maxLowCut =
            -3.0;


        this.maxLowMidCut =
            -2.5;


        this.maxMudCut =
            -2.0;


        this.bodyRecoveryEnabled =
            true;


        this.maxBodyRecoveryGain =
            0.6;


        this.bodyRecoveryQ =
            0.65;


        this.bodyEnhancementEnabled =
            true;


        this.maxBodyEnhancementGain =
            1.15;


        this.bodyEnhancementQ =
            0.65;


        this.bodyHarmonicEnhancementEnabled =
            true;


        this.maxBodyHarmonicDrive =
            0.105;


        this.maxBodyHarmonicMix =
            0.20;


        this.bodyHarmonicPreGain =
            1.55;


        this.bodyHarmonicPostGain =
            0.88;


        this.bodyHarmonicQ =
            0.58;
    }


    // ======================================
    // RESET
    // ======================================

    reset() {

        this.setDefaultMode();


        this.lastSettings =
            null;


        this.lastHarmonicStatus =
            null;
    }


    // ======================================
    // DIAGNÓSTICO DE COMPATIBILIDADE
    // ======================================

    getCompatibilitySnapshot(
        context = null
    ) {

        const hasContext =
            !!context;


        const hasGain =
            hasContext &&
            typeof context.createGain ===
            "function";


        const hasBiquad =
            hasContext &&
            typeof context.createBiquadFilter ===
            "function";


        const hasWaveShaper =
            hasContext &&
            typeof context.createWaveShaper ===
            "function";


        return {

            version:
                this.version,

            contextAvailable:
                hasContext,

            gain:
                hasGain,

            biquad:
                hasBiquad,

            waveShaper:
                hasWaveShaper,

            harmonicOversample:
                this.bodyHarmonicOversample,

            harmonicReady:
                hasWaveShaper &&
                this.bodyHarmonicOversample ===
                "4x"
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.VocalBody =
        VocalBody;
}
