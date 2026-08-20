// ==========================================
// SMOOTHVSTUDIO
// VOCAL TREATMENT PLAN
// V0.2
// ==========================================
//
// Camada de decisão espectral.
//
// IMPORTANTE:
//
// Este módulo NÃO modifica áudio.
//
// Ele recebe a análise do VocalAnalyzer
// e, opcionalmente, o contexto produzido
// pelo SpectralTreatmentBridge.
//
// Estados possíveis:
//
// - preserve
// - improve
// - correct
// - reconstruct
//
// A reconstrução permanece desativada.
//
// O targetDb representa apenas uma
// INTENÇÃO DE PLANEJAMENTO.
//
// Não representa ganho DSP.
//
// ==========================================


class VocalTreatmentPlan {


    constructor(options = {}) {


        this.version =
            "0.2";


        // ==================================
        // LIMITES DE SEGURANÇA
        // ==================================

        this.maxBoostDb =
            options.maxBoostDb ??
            2.0;


        this.maxCutDb =
            options.maxCutDb ??
            -2.5;


        this.minimumConfidence =
            options.minimumConfidence ??
            0.60;


        this.minimumDiagnosticConfidence =
            options.minimumDiagnosticConfidence ??
            0.55;


        this.minimumRegionalCoverage =
            options.minimumRegionalCoverage ??
            0.50;


        this.reconstructionEnabled =
            options.reconstructionEnabled ??
            false;


        // ==================================
        // AUTORIDADE DSP
        // ==================================

        this.processingPermission =
            "none";


        this.audioProcessingEnabled =
            false;


        this.reconstructionAuthority =
            false;
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

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : fallback;
    }


    // ======================================
    // BOOLEANO SEGURO
    // ======================================

    safeBoolean(
        value
    ) {

        return value === true;
    }


    // ======================================
    // NORMALIZAR CONTEXTO DO BRIDGE
    // ======================================

    normalizeSpectralContext(
        context
    ) {

        if (
            !context ||
            typeof context !==
                "object"
        ) {

            return {

                available:
                    false,

                spectral: {

                    valid:
                        false,

                    confidence:
                        0,

                    reference:
                        "unknown",

                    tonalDirection:
                        "unknown",

                    safety:
                        "observe"
                },

                diagnostic: {

                    available:
                        false,

                    valid:
                        false,

                    confidence:
                        0,

                    state:
                        "uncertain",

                    regionalCoverage:
                        0,

                    uncertainRatio:
                        1,

                    conflicts:
                        true,

                    conflictRatio:
                        1,

                    safety:
                        "observe",

                    influence:
                        0
                },

                regions:
                    {},

                decisionPolicy: {

                    analysisOnly:
                        true,

                    regionSpecificEvidenceRequired:
                        true
                },

                safety: {

                    audioProcessing:
                        false,

                    gainGeneration:
                        false,

                    filterGeneration:
                        false,

                    reconstruction:
                        false,

                    processingPermission:
                        "none"
                }
            };
        }


        const spectral =
            context.spectral ||
            {};


        const diagnostic =
            context.diagnostic ||
            {};


        const safety =
            context.safety ||
            {};


        const decisionPolicy =
            context.decisionPolicy ||
            {};


        const diagnosticConfidence =
            this.clamp(
                this.safeNumber(
                    diagnostic.confidence
                ),
                0,
                1
            );


        const regionalCoverage =
            this.clamp(
                this.safeNumber(
                    diagnostic.regionalCoverage
                ),
                0,
                1
            );


        const uncertainRatio =
            this.clamp(
                this.safeNumber(
                    diagnostic.uncertainRatio,
                    1
                ),
                0,
                1
            );


        const conflictRatio =
            this.clamp(
                this.safeNumber(
                    diagnostic.conflictRatio,
                    0
                ),
                0,
                1
            );


        const conflicts =
            diagnostic.conflicts === true ||
            conflictRatio > 0;


        return {

            available:
                true,

            spectral: {

                valid:
                    spectral.valid !==
                    false,

                confidence:
                    this.clamp(
                        this.safeNumber(
                            spectral.confidence
                        ),
                        0,
                        1
                    ),

                reference:
                    spectral.reference ||
                    "unknown",

                tonalDirection:
                    spectral.tonalDirection ||
                    "unknown",

                safety:
                    spectral.safety ||
                    "observe"
            },


            diagnostic: {

                available:
                    diagnostic.available ===
                    true,

                valid:
                    diagnostic.valid !==
                    false,

                confidence:
                    diagnosticConfidence,

                state:
                    diagnostic.state ||
                    "uncertain",

                regionalCoverage,

                uncertainRatio,

                conflicts,

                conflictRatio,

                safety:
                    diagnostic.safety ||
                    "observe",

                influence:
                    this.clamp(
                        this.safeNumber(
                            diagnostic.influence
                        ),
                        0,
                        1
                    )
            },


            regions:
                context.regions ||
                {},


            decisionPolicy: {

                analysisOnly:
                    decisionPolicy
                        .analysisOnly !==
                    false,

                regionSpecificEvidenceRequired:
                    decisionPolicy
                        .regionSpecificEvidenceRequired !==
                    false,

                processingRequiresIndependentEvidence:
                    decisionPolicy
                        .processingRequiresIndependentEvidence !==
                    false,

                diagnosticConfidenceRequired:
                    decisionPolicy
                        .diagnosticConfidenceRequired !==
                    false,

                conflictingEvidenceFallsBackToUncertain:
                    decisionPolicy
                        .conflictingEvidenceFallsBackToUncertain !==
                    false,

                tonalReferenceIsNotEqPreset:
                    decisionPolicy
                        .tonalReferenceIsNotEqPreset !==
                    false
            },


            safety: {

                audioProcessing:
                    safety.audioProcessing ===
                    true,

                gainGeneration:
                    safety.gainGeneration ===
                    true,

                filterGeneration:
                    safety.filterGeneration ===
                    true,

                reconstruction:
                    safety.reconstruction ===
                    true,

                processingPermission:
                    safety.processingPermission ||
                    "none"
            }
        };
    }


    // ======================================
    // DETERMINAR SE O CONTEXTO É SEGURO
    // ======================================

    isContextSafeForPlanning(
        context
    ) {

        if (
            !context.available
        ) {

            return true;
        }


        if (
            context.diagnostic.conflicts
        ) {

            return false;
        }


        if (
            context.diagnostic.state ===
            "uncertain"
        ) {

            return false;
        }


        if (
            context.diagnostic.confidence <
            this.minimumDiagnosticConfidence
        ) {

            return false;
        }


        if (
            context.diagnostic.regionalCoverage <
            this.minimumRegionalCoverage
        ) {

            return false;
        }


        return true;
    }


    // ======================================
    // DETERMINAR ESTADO REGIONAL
    // ======================================
    //
    // O estado acústico não é convertido
    // diretamente em EQ.
    //
    // Apenas determina se existe evidência
    // suficiente para manter ou limitar
    // uma decisão.
    //
    // ======================================

    getRegionalEvidence(
        context,
        regionName
    ) {

        if (
            !context ||
            !context.available
        ) {

            return {

                available:
                    false,

                state:
                    "uncertain",

                confidence:
                    0,

                safety:
                    "observe",

                regionSpecificEvidence:
                    false,

                usable:
                    false
            };
        }


        const region =
            context.regions[
                regionName
            ];


        if (
            !region ||
            typeof region !==
                "object"
        ) {

            return {

                available:
                    false,

                state:
                    "uncertain",

                confidence:
                    0,

                safety:
                    "observe",

                regionSpecificEvidence:
                    false,

                usable:
                    false
            };
        }


        const state =
            region.acousticState ||
            "uncertain";


        const confidence =
            this.clamp(
                this.safeNumber(
                    region.stateConfidence,
                    region.confidence
                ),
                0,
                1
            );


        const regionSpecificEvidence =
            region.regionSpecificEvidence ===
            true;


        const safety =
            region.safety ||
            "observe";


        const conflicts =
            context.diagnostic.conflicts;


        if (
            conflicts
        ) {

            return {

                available:
                    true,

                state:
                    "uncertain",

                confidence:
                    0,

                safety:
                    "observe",

                regionSpecificEvidence,

                usable:
                    false
            };
        }


        if (
            state ===
            "uncertain"
        ) {

            return {

                available:
                    true,

                state,

                confidence,

                safety:
                    "observe",

                regionSpecificEvidence,

                usable:
                    false
            };
        }


        if (
            state ===
            "unstable"
        ) {

            return {

                available:
                    true,

                state,

                confidence,

                safety:
                    "observe",

                regionSpecificEvidence,

                usable:
                    false
            };
        }


        /*
         * "masked" não significa
         * automaticamente deficiência.
         *
         * Pode representar mascaramento
         * perceptual ou conflito entre regiões.
         *
         * Portanto, não liberamos tratamento
         * apenas por esse estado.
         */

        if (
            state ===
            "masked"
        ) {

            return {

                available:
                    true,

                state,

                confidence,

                safety:
                    "observe",

                regionSpecificEvidence,

                usable:
                    false
            };
        }


        if (
            !regionSpecificEvidence
        ) {

            return {

                available:
                    true,

                state,

                confidence,

                safety:
                    "cautious",

                regionSpecificEvidence:
                    false,

                usable:
                    false
            };
        }


        if (
            safety ===
            "observe"
        ) {

            return {

                available:
                    true,

                state,

                confidence,

                safety,

                regionSpecificEvidence,

                usable:
                    false
            };
        }


        return {

            available:
                true,

            state,

            confidence,

            safety,

            regionSpecificEvidence,

            usable:
                confidence >=
                this.minimumDiagnosticConfidence
        };
    }


    // ======================================
    // CONVERTER VALOR EM DECISÃO
    // ======================================

    createDecision(
        name,
        score,
        options = {}
    ) {

        const safeScore =
            this.clamp(
                this.safeNumber(
                    score
                ),
                0,
                1
            );


        const confidence =
            this.clamp(
                this.safeNumber(
                    options.confidence,
                    0
                ),
                0,
                1
            );


        const evidenceState =
            options.evidenceState ||
            "unknown";


        const evidenceSource =
            options.evidenceSource ||
            "analyzer";


        const processingPermission =
            options.processingPermission ||
            "none";


        /*
         * Sem confiança suficiente,
         * a engine preserva a região.
         */

        if (
            confidence <
            this.minimumConfidence
        ) {

            return {

                name,

                state:
                    "preserve",

                score:
                    safeScore,

                confidence,

                targetDb:
                    0,

                reconstruction:
                    false,

                evidenceState,

                evidenceSource,

                processingPermission:
                    "none",

                planningOnly:
                    true,

                reason:
                    "insufficient-confidence"
            };
        }


        let state =
            "preserve";


        let targetDb =
            0;


        // ==================================
        // EXCESSO
        // ==================================

        if (
            options.excessive === true
        ) {

            if (
                safeScore >=
                0.70
            ) {

                state =
                    "correct";


                targetDb =
                    this.maxCutDb *
                    this.clamp(
                        (
                            safeScore -
                            0.60
                        ) /
                        0.40,
                        0,
                        1
                    );
            }

            else if (
                safeScore >=
                0.50
            ) {

                state =
                    "improve";


                targetDb =
                    this.maxCutDb *
                    0.45;
            }
        }


        // ==================================
        // DEFICIÊNCIA
        // ==================================

        if (
            options.deficient === true
        ) {

            if (
                safeScore >=
                0.75
            ) {

                state =
                    "improve";


                targetDb =
                    this.maxBoostDb *
                    this.clamp(
                        (
                            safeScore -
                            0.60
                        ) /
                        0.40,
                        0,
                        1
                    );
            }

            else if (
                safeScore >=
                0.55
            ) {

                state =
                    "improve";


                targetDb =
                    this.maxBoostDb *
                    0.35;
            }
        }


        // ==================================
        // RECONSTRUÇÃO
        // ==================================

        if (
            options.reconstructionScore >=
            0.80 &&
            this.reconstructionEnabled &&
            options.allowReconstruction ===
            true
        ) {

            state =
                "reconstruct";


            targetDb =
                this.clamp(
                    targetDb,
                    0,
                    this.maxBoostDb
                );
        }


        /*
         * A autoridade de processamento
         * permanece bloqueada nesta versão.
         */

        return {

            name,

            state,

            score:
                safeScore,

            confidence,

            targetDb,

            reconstruction:
                state ===
                "reconstruct",

            evidenceState,

            evidenceSource,

            processingPermission:
                "none",

            planningOnly:
                true,

            reason:
                options.reason ||
                "analysis-supported-planning"
        };
    }


    // ======================================
    // APLICAR CONTEXTO REGIONAL À DECISÃO
    // ======================================
    //
    // Esta função NÃO cria uma nova ordem
    // de EQ.
    //
    // Ela apenas pode reduzir a autoridade
    // de uma decisão anterior.
    //
    // Nunca aumenta autoridade.
    //
    // ======================================

    reconcileDecision(
        decision,
        context,
        regionName
    ) {

        if (
            !decision
        ) {

            return null;
        }


        const regional =
            this.getRegionalEvidence(
                context,
                regionName
            );


        /*
         * Sem contexto novo:
         *
         * preservar comportamento V0.1.
         */

        if (
            !context.available
        ) {

            return {

                ...decision,

                contextApplied:
                    false,

                regionalState:
                    "unavailable",

                regionalConfidence:
                    0,

                authority:
                    "legacy-analysis"
            };
        }


        /*
         * Qualquer conflito faz fallback
         * para preservação.
         */

        if (
            context.diagnostic.conflicts
        ) {

            return {

                ...decision,

                state:
                    "preserve",

                targetDb:
                    0,

                reconstruction:
                    false,

                contextApplied:
                    true,

                regionalState:
                    "uncertain",

                regionalConfidence:
                    0,

                authority:
                    "diagnostic-fallback",

                processingPermission:
                    "none",

                reason:
                    "conflicting-evidence"
            };
        }


        /*
         * Diagnóstico global incerto:
         * não há autorização para tratamento.
         */

        if (
            context.diagnostic.state ===
            "uncertain"
        ) {

            return {

                ...decision,

                state:
                    "preserve",

                targetDb:
                    0,

                reconstruction:
                    false,

                contextApplied:
                    true,

                regionalState:
                    "uncertain",

                regionalConfidence:
                    0,

                authority:
                    "diagnostic-fallback",

                processingPermission:
                    "none",

                reason:
                    "diagnostic-uncertain"
            };
        }


        /*
         * Sem evidência regional específica,
         * não aumentamos a decisão.
         *
         * A análise original continua registrada,
         * mas a autoridade permanece observacional.
         */

        if (
            !regional.usable
        ) {

            return {

                ...decision,

                contextApplied:
                    true,

                regionalState:
                    regional.state,

                regionalConfidence:
                    regional.confidence,

                authority:
                    "global-evidence-only",

                processingPermission:
                    "none",

                planningOnly:
                    true
            };
        }


        /*
         * Estado natural:
         *
         * preservação tem prioridade.
         */

        if (
            regional.state ===
            "natural"
        ) {

            return {

                ...decision,

                state:
                    "preserve",

                targetDb:
                    0,

                reconstruction:
                    false,

                contextApplied:
                    true,

                regionalState:
                    "natural",

                regionalConfidence:
                    regional.confidence,

                authority:
                    "regional-evidence",

                processingPermission:
                    "none",

                reason:
                    "natural-region-preserved"
            };
        }


        /*
         * Estado elevado:
         *
         * Pode confirmar uma decisão
         * de excesso já existente.
         *
         * Nunca cria correção do zero.
         */

        if (
            regional.state ===
            "elevated"
        ) {

            if (
                decision.state ===
                    "correct" ||
                decision.state ===
                    "improve"
            ) {

                return {

                    ...decision,

                    contextApplied:
                        true,

                    regionalState:
                        "elevated",

                    regionalConfidence:
                        regional.confidence,

                    authority:
                        "regional-confirmed",

                    processingPermission:
                        "none",

                    planningOnly:
                        true,

                    reason:
                        "regional-elevation-confirms-analysis"
                };
            }


            return {

                ...decision,

                state:
                    "preserve",

                targetDb:
                    0,

                reconstruction:
                    false,

                contextApplied:
                    true,

                regionalState:
                    "elevated",

                regionalConfidence:
                    regional.confidence,

                authority:
                    "regional-evidence-insufficient-for-new-treatment",

                processingPermission:
                    "none",

                reason:
                    "elevated-state-does-not-create-treatment-alone"
            };
        }


        /*
         * Estado recessed:
         *
         * Pode confirmar uma deficiência
         * já detectada.
         *
         * Nunca cria boost automaticamente.
         */

        if (
            regional.state ===
            "recessed"
        ) {

            if (
                decision.state ===
                "improve"
            ) {

                return {

                    ...decision,

                    contextApplied:
                        true,

                    regionalState:
                        "recessed",

                    regionalConfidence:
                        regional.confidence,

                    authority:
                        "regional-confirmed",

                    processingPermission:
                        "none",

                    planningOnly:
                        true,

                    reason:
                        "regional-recession-confirms-analysis"
                };
            }


            return {

                ...decision,

                state:
                    "preserve",

                targetDb:
                    0,

                reconstruction:
                    false,

                contextApplied:
                    true,

                regionalState:
                    "recessed",

                regionalConfidence:
                    regional.confidence,

                authority:
                    "regional-evidence-insufficient-for-new-treatment",

                processingPermission:
                    "none",

                reason:
                    "recessed-state-does-not-create-treatment-alone"
            };
        }


        /*
         * Qualquer estado desconhecido
         * retorna ao modo conservador.
         */

        return {

            ...decision,

            state:
                "preserve",

            targetDb:
                0,

            reconstruction:
                false,

            contextApplied:
                true,

            regionalState:
                "uncertain",

            regionalConfidence:
                0,

            authority:
                "diagnostic-fallback",

            processingPermission:
                "none",

            reason:
                "unsupported-regional-state"
        };
    }


    // ======================================
    // CORPO
    // ======================================

    analyzeBody(
        analysis
    ) {

        const characteristics =
            analysis.characteristics ||
            {};


        const body =
            this.safeNumber(
                characteristics.body
            );


        /*
         * Body baixo indica possível
         * necessidade de recuperação.
         *
         * Não aplicamos ganho aqui.
         */

        const deficiency =
            this.clamp(
                1 -
                body,
                0,
                1
            );


        const confidence =
            this.clamp(
                body >= 0.05
                    ? 0.72
                    : 0.40,
                0,
                1
            );


        return this.createDecision(
            "body",
            deficiency,
            {

                deficient:
                    true,

                confidence,

                reconstructionScore:
                    deficiency
            }
        );
    }


    // ======================================
    // GRAVE
    // ======================================

    analyzeBass(
        analysis
    ) {

        const bands =
            analysis.bands ||
            {};


        const ratios =
            analysis.ratios ||
            {};


        const body =
            this.safeNumber(
                bands.body
            );


        const bodyRatio =
            this.safeNumber(
                ratios.body
            );


        /*
         * Excesso de grave não deve ser
         * confundido com falta de corpo.
         *
         * Usamos duas evidências.
         */

        const excessive =
            this.clamp(
                (
                    bodyRatio -
                    0.25
                ) /
                0.35,
                0,
                1
            );


        const deficiency =
            this.clamp(
                (
                    0.03 -
                    bodyRatio
                ) /
                0.03,
                0,
                1
            );


        const confidence =
            body > 0.00001
                ? 0.65
                : 0.40;


        if (
            excessive >
            deficiency
        ) {

            return this.createDecision(
                "bass",
                excessive,
                {

                    excessive:
                        true,

                    confidence
                }
            );
        }


        return this.createDecision(
            "bass",
            deficiency,
            {

                deficient:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // MÉDIO
    // ======================================

    analyzeMid(
        analysis
    ) {

        const bands =
            analysis.bands ||
            {};


        const mid =
            this.safeNumber(
                bands.mid
            );


        const lowMid =
            this.safeNumber(
                bands.lowMid
            );


        /*
         * Relação médio / médio-grave.
         */

        const ratio =
            lowMid > 0
                ? mid /
                  lowMid
                : 0;


        const excessive =
            this.clamp(
                (
                    ratio -
                    1.25
                ) /
                1.25,
                0,
                1
            );


        const deficient =
            this.clamp(
                (
                    0.45 -
                    ratio
                ) /
                0.45,
                0,
                1
            );


        const confidence =
            mid > 0.00001
                ? 0.68
                : 0.40;


        if (
            excessive >
            deficient
        ) {

            return this.createDecision(
                "mid",
                excessive,
                {

                    excessive:
                        true,

                    confidence
                }
            );
        }


        return this.createDecision(
            "mid",
            deficient,
            {

                deficient:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // PRESENÇA
    // ======================================

    analyzePresence(
        analysis
    ) {

        const characteristics =
            analysis.characteristics ||
            {};


        const presence =
            this.safeNumber(
                characteristics.presence
            );


        const deficiency =
            this.clamp(
                1 -
                presence,
                0,
                1
            );


        const excessive =
            this.clamp(
                (
                    presence -
                    0.80
                ) /
                0.20,
                0,
                1
            );


        const confidence =
            presence > 0.03
                ? 0.72
                : 0.42;


        if (
            excessive >
            deficiency
        ) {

            return this.createDecision(
                "presence",
                excessive,
                {

                    excessive:
                        true,

                    confidence
                }
            );
        }


        return this.createDecision(
            "presence",
            deficiency,
            {

                deficient:
                    true,

                confidence,

                reconstructionScore:
                    deficiency
            }
        );
    }


    // ======================================
    // DUREZA / MÉDIO-AGUDO
    // ======================================

    analyzeHarshness(
        analysis
    ) {

        const characteristics =
            analysis.characteristics ||
            {};


        const hardness =
            this.safeNumber(
                characteristics.hardness
            );


        const roughness =
            this.safeNumber(
                characteristics.roughness
            );


        const score =
            this.clamp(
                (
                    hardness *
                    0.65
                ) +
                (
                    roughness *
                    0.35
                ),
                0,
                1
            );


        const confidence =
            0.78;


        return this.createDecision(
            "harshness",
            score,
            {

                excessive:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // SIBILÂNCIA
    // ======================================

    analyzeSibilance(
        analysis
    ) {

        const characteristics =
            analysis.characteristics ||
            {};


        const sibilance =
            this.safeNumber(
                characteristics.sibilance
            );


        const temporal =
            this.safeNumber(
                analysis
                    .sibilanceAnalysis
                    ?.temporal
            );


        const score =
            this.clamp(
                (
                    sibilance *
                    0.65
                ) +
                (
                    temporal *
                    0.35
                ),
                0,
                1
            );


        const confidence =
            temporal >
            0.05
                ? 0.82
                : 0.65;


        return this.createDecision(
            "sibilance",
            score,
            {

                excessive:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // AIR
    // ======================================

    analyzeAir(
        analysis
    ) {

        const ratios =
            analysis.ratios ||
            {};


        const air =
            this.safeNumber(
                ratios.air
            );


        const noise =
            analysis.noiseAnalysis ||
            {};


        const noiseConfidence =
            this.safeNumber(
                noise.confidence
            );


        const noiseHigh =
            this.safeNumber(
                noise.highRelative
            );


        /*
         * Air alto não é automaticamente
         * ruim.
         *
         * Só consideramos excesso quando
         * há evidência adicional.
         */

        const excessive =
            this.clamp(
                (
                    air -
                    0.16
                ) /
                0.18,
                0,
                1
            );


        const noiseFactor =
            this.clamp(
                noiseHigh *
                3,
                0,
                1
            );


        const combined =
            this.clamp(
                (
                    excessive *
                    0.65
                ) +
                (
                    noiseFactor *
                    0.35
                ),
                0,
                1
            );


        const confidence =
            noiseConfidence >= 0.60
                ? 0.78
                : 0.64;


        return this.createDecision(
            "air",
            combined,
            {

                excessive:
                    true,

                confidence
            }
        );
    }


    // ======================================
    // GERAR PLANO
    // ======================================
    //
    // Compatibilidade:
    //
    // createPlan(analysis)
    //
    // continua funcionando.
    //
    // Nova forma:
    //
    // createPlan(
    //     analysis,
    //     spectralContext
    // )
    //
    // ======================================

    createPlan(
        analysis,
        spectralContext = null
    ) {

        if (
            !analysis
        ) {

            throw new Error(
                "Análise vocal inválida."
            );
        }


        const context =
            this.normalizeSpectralContext(
                spectralContext
            );


        const rawRegions = {

            bass:
                this.analyzeBass(
                    analysis
                ),

            body:
                this.analyzeBody(
                    analysis
                ),

            mid:
                this.analyzeMid(
                    analysis
                ),

            presence:
                this.analyzePresence(
                    analysis
                ),

            harshness:
                this.analyzeHarshness(
                    analysis
                ),

            sibilance:
                this.analyzeSibilance(
                    analysis
                ),

            air:
                this.analyzeAir(
                    analysis
                )
        };


        const regions = {};


        for (
            const key in rawRegions
        ) {

            regions[key] =
                this.reconcileDecision(
                    rawRegions[key],
                    context,
                    key
                );
        }


        const plan = {

            version:
                this.version,


            // ==================================
            // REGIÕES
            // ==================================

            regions,


            // ==================================
            // CONTEXTO ESPECTRAL
            // ==================================

            spectralContext: {

                available:
                    context.available,

                reference:
                    context.spectral.reference,

                tonalDirection:
                    context.spectral.tonalDirection,

                confidence:
                    context.spectral.confidence,

                diagnosticState:
                    context.diagnostic.state,

                diagnosticConfidence:
                    context.diagnostic.confidence,

                regionalCoverage:
                    context.diagnostic.regionalCoverage,

                conflicts:
                    context.diagnostic.conflicts,

                safety:
                    context.diagnostic.safety
            },


            // ==================================
            // RECONSTRUÇÃO
            // ==================================

            reconstruction: {

                enabled:
                    false,

                authority:
                    false,

                body:
                    false,

                presence:
                    false,

                air:
                    false
            },


            // ==================================
            // SEGURANÇA
            // ==================================

            safety: {

                maxBoostDb:
                    this.maxBoostDb,

                maxCutDb:
                    this.maxCutDb,

                minimumConfidence:
                    this.minimumConfidence,

                minimumDiagnosticConfidence:
                    this.minimumDiagnosticConfidence,

                minimumRegionalCoverage:
                    this.minimumRegionalCoverage,

                processingPermission:
                    "none",

                audioProcessing:
                    false,

                filterGeneration:
                    false,

                gainGeneration:
                    false,

                reconstruction:
                    false,

                planningOnly:
                    true
            }
        };


        return plan;
    }


    // ======================================
    // VERIFICAR SE O PLANO É OBSERVACIONAL
    // ======================================

    isAnalysisOnly(
        plan
    ) {

        if (
            !plan ||
            !plan.safety
        ) {

            return false;
        }


        return (

            plan.safety
                .processingPermission ===
            "none"

        ) && (

            plan.safety
                .audioProcessing ===
            false

        ) && (

            plan.safety
                .filterGeneration ===
            false

        ) && (

            plan.safety
                .gainGeneration ===
            false

        ) && (

            plan.safety
                .reconstruction ===
            false

        ) && (

            plan.safety
                .planningOnly ===
            true
        );
    }


    // ======================================
    // RESUMO
    // ======================================

    summarize(
        plan
    ) {

        if (
            !plan ||
            !plan.regions
        ) {

            return [];
        }


        const summary = [];


        const regions =
            plan.regions;


        for (
            const key in regions
        ) {

            const region =
                regions[key];


            summary.push({

                region:
                    key,

                state:
                    region.state,

                targetDb:
                    region.targetDb,

                confidence:
                    region.confidence,

                regionalState:
                    region.regionalState ||
                    "unavailable",

                regionalConfidence:
                    this.safeNumber(
                        region.regionalConfidence
                    ),

                authority:
                    region.authority ||
                    "unknown",

                planningOnly:
                    region.planningOnly !==
                    false,

                reason:
                    region.reason ||
                    "unspecified"
            });
        }


        return summary;
    }
}


// ==========================================
// DISPONIBILIZAR
// ==========================================

window.VocalTreatmentPlan =
    VocalTreatmentPlan;