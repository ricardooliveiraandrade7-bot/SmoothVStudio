// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL DIAGNOSTIC OBSERVER
// V0.4
// ==========================================
//
// Camada de observação e interpretação
// contextual da inteligência espectral.
//
// RESPONSABILIDADE:
//
// - receber o contexto do
//   SpectralTreatmentBridge;
// - receber evidência do
//   SpectralRegionalMeasurement;
// - validar a estrutura;
// - criar snapshots seguros;
// - interpretar a qualidade da evidência;
// - distinguir evidência global de
//   evidência específica de região;
// - classificar estados acústicos regionais.
//
// ESTE MÓDULO NÃO:
//
// - processa áudio;
// - cria filtros;
// - altera ganho;
// - altera timbre;
// - altera o TreatmentPlan;
// - executa DSP;
// - gera parâmetros de EQ;
// - gera parâmetros de compressão;
// - reconstrói espectro.
//
// REGRA FUNDAMENTAL:
//
// Estado acústico NÃO é ordem de processamento.
//
// A medição regional aumenta a qualidade
// da evidência disponível, mas não concede
// autoridade DSP.
//
// ==========================================


class SpectralDiagnosticObserver {


    constructor() {


        this.version =
            "0.4";


        this.lastSnapshot =
            null;


        this.lastInterpretation =
            null;
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
    // TEXTO SEGURO
    // ======================================

    safeString(
        value,
        fallback = "unknown"
    ) {

        if (
            typeof value !==
            "string"
        ) {

            return fallback;
        }


        return value;
    }


    // ======================================
    // BOOLEANO SEGURO
    // ======================================

    safeBoolean(
        value
    ) {

        return value ===
            true;
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
    // VALIDAR CONTEXTO
    // ======================================

    validateContext(
        context
    ) {

        if (
            !context ||
            typeof context !==
            "object"
        ) {

            return false;
        }


        if (
            !context.spectral ||
            !context.safety
        ) {

            return false;
        }


        return true;
    }


    // ======================================
    // VALIDAR ESTADO ACÚSTICO
    // ======================================

    isValidAcousticState(
        state
    ) {

        const validStates = [

            "natural",

            "elevated",

            "recessed",

            "unstable",

            "masked",

            "uncertain",

            "contextual",

            "supported"
        ];


        return validStates
            .indexOf(
                state
            ) !== -1;
    }


    // ======================================
    // COPIAR REGIÃO
    // ======================================

    copyRegion(
        region
    ) {

        if (
            !region ||
            typeof region !==
            "object"
        ) {

            return {

                support:
                    0,

                confidence:
                    0,

                evidence:
                    "low",

                safety:
                    "observe",

                usable:
                    false,

                regionSpecificEvidence:
                    false,

                evidenceSource:
                    "unknown",

                reason:
                    "region-unavailable",

                reference:
                    "unknown",

                tonalDirection:
                    "unknown",

                acousticState:
                    "uncertain",

                stateConfidence:
                    0,

                stateEvidence:
                    "none",

                temporalEvidence:
                    false,

                regionalMeasurement:
                    false
            };
        }


        const requestedState =
            this.safeString(
                region.acousticState,
                "uncertain"
            );


        const acousticState =
            this.isValidAcousticState(
                requestedState
            )
                ? requestedState
                : "uncertain";


        return {

            support:
                this.safeNumber(
                    region.support
                ),

            confidence:
                this.safeNumber(
                    region.confidence
                ),

            evidence:
                this.safeString(
                    region.evidence,
                    "low"
                ),

            safety:
                this.safeString(
                    region.safety,
                    "observe"
                ),

            usable:
                this.safeBoolean(
                    region.usable
                ),

            regionSpecificEvidence:
                this.safeBoolean(
                    region.regionSpecificEvidence
                ),

            evidenceSource:
                this.safeString(
                    region.evidenceSource,
                    "unknown"
                ),

            reason:
                this.safeString(
                    region.reason,
                    "unknown"
                ),

            reference:
                this.safeString(
                    region.reference,
                    "unknown"
                ),

            tonalDirection:
                this.safeString(
                    region.tonalDirection,
                    "unknown"
                ),

            acousticState:
                acousticState,

            stateConfidence:
                this.clamp(
                    this.safeNumber(
                        region.stateConfidence
                    ),
                    0,
                    1
                ),

            stateEvidence:
                this.safeString(
                    region.stateEvidence,
                    "none"
                ),

            temporalEvidence:
                this.safeBoolean(
                    region.temporalEvidence
                ),

            regionalMeasurement:
                this.safeBoolean(
                    region.regionalMeasurement
                ),

            energy:
                this.safeNumber(
                    region.energy
                ),

            energyShare:
                this.safeNumber(
                    region.energyShare
                ),

            normalizedEnergy:
                this.safeNumber(
                    region.normalizedEnergy
                ),

            relativeEnergy:
                this.safeNumber(
                    region.relativeEnergy
                ),

            stability:
                this.clamp(
                    this.safeNumber(
                        region.stability
                    ),
                    0,
                    1
                ),

            activity:
                this.clamp(
                    this.safeNumber(
                        region.activity
                    ),
                    0,
                    1
                ),

            bandCount:
                this.safeNumber(
                    region.bandCount
                ),

            lowHz:
                this.safeNumber(
                    region.lowHz
                ),

            highHz:
                this.safeNumber(
                    region.highHz
                ),

            evidenceLevel:
                this.safeString(
                    region.evidenceLevel,
                    "none"
                )
        };
    }


    // ======================================
    // MAPEAR MEDIÇÃO REGIONAL
    // ======================================
    //
    // A medição regional utiliza nomes
    // próprios para suas regiões.
    //
    // O Bridge utiliza uma nomenclatura
    // contextual diferente.
    //
    // Esta função cria uma ponte explícita
    // sem alterar nenhum dos módulos
    // anteriores.
    //
    // ======================================

    getRegionalMeasurementMap() {

        return {

            sub:
                "sub",

            bass:
                "bass",

            body:
                "body",

            lowMid:
                "lowMid",

            mid:
                "mid",

            presence:
                "presence",

            upperPresence:
                "upperPresence",

            sibilance:
                "sibilance",

            air:
                "air"
        };
    }


    // ======================================
    // ENRIQUECER REGIÕES COM MEDIÇÃO
    // ======================================
    //
    // A medição regional tem prioridade
    // apenas sobre campos de evidência
    // regional.
    //
    // A referência tonal global continua
    // vindo do SpectralTreatmentBridge.
    //
    // Nenhuma decisão DSP é criada aqui.
    //
    // ======================================

    mergeRegionalMeasurement(
        regions,
        regionalMeasurement
    ) {

        const baseRegions =
            regions &&
            typeof regions ===
            "object"

                ? regions
                : {};


        const measurement =
            regionalMeasurement &&
            typeof regionalMeasurement ===
            "object"

                ? regionalMeasurement
                : null;


        if (
            !measurement ||
            !measurement.regions ||
            typeof measurement.regions !==
            "object"
        ) {

            return baseRegions;
        }


        const merged =
            {};


        const baseNames =
            Object.keys(
                baseRegions
            );


        for (
            let i = 0;
            i < baseNames.length;
            i++
        ) {

            const name =
                baseNames[i];


            merged[name] =
                baseRegions[name];
        }


        const map =
            this.getRegionalMeasurementMap();


        const measurementNames =
            Object.keys(
                map
            );


        for (
            let i = 0;
            i < measurementNames.length;
            i++
        ) {

            const observerName =
                measurementNames[i];


            const measurementName =
                map[
                    observerName
                ];


            const measuredRegion =
                measurement
                    .regions[
                        measurementName
                    ];


            if (
                !measuredRegion
            ) {

                continue;
            }


            const existingRegion =
                merged[
                    observerName
                ] || {};


            /*
             * A medição regional passa a
             * representar a evidência específica
             * da região.
             *
             * Campos globais do Bridge são
             * preservados quando existentes.
             */

            merged[
                observerName
            ] = {

                ...existingRegion,

                lowHz:
                    measuredRegion.lowHz ??
                    existingRegion.lowHz,

                highHz:
                    measuredRegion.highHz ??
                    existingRegion.highHz,

                bandCount:
                    measuredRegion.bandCount ??
                    0,

                energy:
                    measuredRegion.energy ??
                    0,

                energyShare:
                    measuredRegion.energyShare ??
                    0,

                relativeEnergy:
                    measuredRegion.relativeEnergy ??
                    0,

                normalizedEnergy:
                    measuredRegion.normalizedEnergy ??
                    0,

                stability:
                    measuredRegion.stability ??
                    0,

                confidence:
                    measuredRegion.confidence ??
                    0,

                activity:
                    measuredRegion.activity ??
                    0,

                temporalEvidence:
                    measuredRegion.temporalEvidence ===
                    true,

                evidence:
                    measuredRegion.evidence ||
                    "none",

                evidenceLevel:
                    measuredRegion.evidenceLevel ||
                    measuredRegion.evidence ||
                    "none",

                usable:
                    measuredRegion.usable ===
                    true,

                regionalMeasurement:
                    measuredRegion.regionalMeasurement ===
                    true,

                regionSpecificEvidence:
                    measuredRegion.regionSpecificEvidence ===
                    true,

                stateConfidence:
                    measuredRegion.stateConfidence ??
                    0,

                acousticState:
                    this.isValidAcousticState(
                        measuredRegion.acousticState
                    )
                        ? measuredRegion.acousticState
                        : "uncertain",

                stateEvidence:
                    measuredRegion.stateEvidence ||
                    "none",

                evidenceSource:
                    "spectral-regional-measurement",

                reason:
                    measuredRegion.reason ||
                    "regional-measurement-available",

                measurementBandCount:
                    measuredRegion.bandCount ??
                    0
            };
        }


        return merged;
    }


    // ======================================
    // CRIAR SNAPSHOT
    // ======================================

    createSnapshot(
        context
    ) {

        if (
            !this.validateContext(
                context
            )
        ) {

            return {

                valid:
                    false,

                version:
                    this.version,

                reason:
                    "invalid-spectral-context",

                spectral:
                    null,

                regions:
                    {},

                decisionPolicy:
                    null,

                safety:
                    null,

                regionalMeasurement:
                    null
            };
        }


        const spectral =
            context.spectral;


        /*
         * O contexto global continua sendo
         * a base.
         *
         * A medição regional é anexada
         * separadamente e somente então
         * incorporada às regiões.
         */

        const baseRegions =
            context.regions ||
            {};


        const mergedRegions =
            this.mergeRegionalMeasurement(
                baseRegions,
                context.regionalMeasurement
            );


        const snapshotRegions =
            {};


        const regionNames =
            Object.keys(
                mergedRegions
            );


        for (
            let i = 0;
            i < regionNames.length;
            i++
        ) {

            const name =
                regionNames[i];


            snapshotRegions[name] =
                this.copyRegion(
                    mergedRegions[name]
                );
        }


        const policy =
            context.decisionPolicy ||
            {};


        const safety =
            context.safety ||
            {};


        const regionalMeasurement =
            context.regionalMeasurement &&
            typeof context.regionalMeasurement ===
            "object"

                ? {

                    valid:
                        this.safeBoolean(
                            context
                                .regionalMeasurement
                                .valid
                        ),

                    available:
                        this.safeBoolean(
                            context
                                .regionalMeasurement
                                .available
                        ),

                    confidence:
                        this.clamp(
                            this.safeNumber(
                                context
                                    .regionalMeasurement
                                    .confidence
                            ),
                            0,
                            1
                        ),

                    evidence:
                        this.safeString(
                            context
                                .regionalMeasurement
                                .evidence,
                            "none"
                        ),

                    regionCount:
                        this.safeNumber(
                            context
                                .regionalMeasurement
                                .regionCount
                        ),

                    usableRegions:
                        this.safeNumber(
                            context
                                .regionalMeasurement
                                .usableRegions
                        ),

                    supportedRegions:
                        this.safeNumber(
                            context
                                .regionalMeasurement
                                .supportedRegions
                        ),

                    temporalEvidence:
                        this.clamp(
                            this.safeNumber(
                                context
                                    .regionalMeasurement
                                    .temporalEvidence
                            ),
                            0,
                            1
                        ),

                    processingPermission:
                        "none"

                }

                : null;


        return {

            valid:
                true,

            version:
                this.version,

            bridgeVersion:
                this.safeString(
                    context.version,
                    "unknown"
                ),

            spectral: {

                valid:
                    this.safeBoolean(
                        spectral.valid
                    ),

                reference:
                    this.safeString(
                        spectral.reference
                    ),

                tonalDirection:
                    this.safeString(
                        spectral.tonalDirection
                    ),

                confidence:
                    this.clamp(
                        this.safeNumber(
                            spectral.confidence
                        ),
                        0,
                        1
                    ),

                evidence:
                    this.safeString(
                        spectral.evidence,
                        "low"
                    ),

                influence:
                    this.clamp(
                        this.safeNumber(
                            spectral.influence
                        ),
                        0,
                        1
                    ),

                safety:
                    this.safeString(
                        spectral.safety,
                        "observe"
                    ),

                ambiguous:
                    this.safeBoolean(
                        spectral.ambiguous
                    ),

                usable:
                    this.safeBoolean(
                        spectral.usable
                    )
            },

            regions:
                snapshotRegions,

            regionalMeasurement:
                regionalMeasurement,

            decisionPolicy: {

                analysisOnly:
                    this.safeBoolean(
                        policy.analysisOnly
                    ),

                regionSpecificEvidenceRequired:
                    this.safeBoolean(
                        policy.regionSpecificEvidenceRequired
                    ),

                processingRequiresIndependentEvidence:
                    this.safeBoolean(
                        policy.processingRequiresIndependentEvidence
                    ),

                tonalReferenceIsNotEqPreset:
                    this.safeBoolean(
                        policy.tonalReferenceIsNotEqPreset
                    )
            },

            safety: {

                audioProcessing:
                    this.safeBoolean(
                        safety.audioProcessing
                    ),

                gainGeneration:
                    this.safeBoolean(
                        safety.gainGeneration
                    ),

                filterGeneration:
                    this.safeBoolean(
                        safety.filterGeneration
                    ),

                reconstruction:
                    this.safeBoolean(
                        safety.reconstruction
                    )
            }
        };
    }


    // ======================================
    // OBSERVAR
    // ======================================

    observe(
        context,
        regionalMeasurement = null
    ) {

        /*
         * Compatibilidade:
         *
         * se a medição for passada como
         * segundo argumento, ela é anexada
         * ao contexto sem modificar o objeto
         * original.
         */

        let observationContext =
            context;


        if (
            regionalMeasurement &&
            context &&
            typeof context ===
            "object"
        ) {

            observationContext = {

                ...context,

                regionalMeasurement:
                    regionalMeasurement
            };
        }


        const snapshot =
            this.createSnapshot(
                observationContext
            );


        this.lastSnapshot =
            snapshot;


        this.lastInterpretation =
            this.interpretSnapshot(
                snapshot
            );


        return snapshot;
    }


    // ======================================
    // CLASSIFICAR CONFIANÇA
    // ======================================

    classifyConfidence(
        confidence
    ) {

        const value =
            this.clamp(
                this.safeNumber(
                    confidence
                ),
                0,
                1
            );


        if (
            value < 0.40
        ) {

            return "low";
        }


        if (
            value < 0.70
        ) {

            return "medium";
        }


        if (
            value < 0.85
        ) {

            return "high";
        }


        return "very-high";
    }


    // ======================================
    // CLASSIFICAR EVIDÊNCIA REGIONAL
    // ======================================

    classifyRegionalEvidence(
        region
    ) {

        if (
            !region
        ) {

            return {

                level:
                    "none",

                usable:
                    false,

                reason:
                    "region-unavailable"
            };
        }


        if (
            !region.regionSpecificEvidence
        ) {

            return {

                level:
                    "global-only",

                usable:
                    false,

                reason:
                    "region-specific-evidence-required"
            };
        }


        const confidence =
            this.clamp(
                this.safeNumber(
                    region.stateConfidence ??
                    region.confidence
                ),
                0,
                1
            );


        return {

            level:
                this.classifyConfidence(
                    confidence
                ),

            usable:
                region.usable ===
                true,

            reason:
                region.usable ===
                true
                    ? "region-specific-evidence-available"
                    : "region-evidence-not-usable"
        };
    }


    // ======================================
    // DETERMINAR ESTADO ACÚSTICO
    // ======================================
    //
    // FUNÇÃO CONSERVADORA.
    //
    // A medição regional atual pode
    // sustentar "supported", mas ainda
    // não determina automaticamente
    // elevated/recessed/natural.
    //
    // O Observer jamais transforma
    // evidência global em evidência
    // específica.
    //
    // ======================================

    determineAcousticState(
        region
    ) {

        if (
            !region ||
            typeof region !==
            "object"
        ) {

            return {

                state:
                    "uncertain",

                confidence:
                    0,

                evidence:
                    "none",

                actionable:
                    false,

                reason:
                    "region-unavailable"
            };
        }


        const hasRegionalMeasurement =
            region.regionalMeasurement ===
            true;


        const hasRegionalEvidence =
            region.regionSpecificEvidence ===
            true;


        const regionalConfidence =
            this.clamp(
                this.safeNumber(
                    region.stateConfidence ??
                    region.confidence
                ),
                0,
                1
            );


        const stateEvidence =
            this.safeString(
                region.stateEvidence,
                "none"
            );


        // ----------------------------------
        // SEM MEDIÇÃO REGIONAL
        // ----------------------------------

        if (
            !hasRegionalMeasurement
        ) {

            return {

                state:
                    "contextual",

                confidence:
                    this.clamp(
                        this.safeNumber(
                            region.confidence
                        ),
                        0,
                        1
                    ),

                evidence:
                    "global-only",

                actionable:
                    false,

                reason:
                    "no-regional-measurement"
            };
        }


        // ----------------------------------
        // MEDIÇÃO SEM EVIDÊNCIA REGIONAL
        // ----------------------------------

        if (
            !hasRegionalEvidence
        ) {

            return {

                state:
                    "uncertain",

                confidence:
                    regionalConfidence,

                evidence:
                    stateEvidence,

                actionable:
                    false,

                reason:
                    "regional-measurement-without-independent-evidence"
            };
        }


        // ----------------------------------
        // CONFIANÇA BAIXA
        // ----------------------------------

        if (
            regionalConfidence <
            0.40
        ) {

            return {

                state:
                    "uncertain",

                confidence:
                    regionalConfidence,

                evidence:
                    stateEvidence,

                actionable:
                    false,

                reason:
                    "regional-state-confidence-too-low"
            };
        }


        // ----------------------------------
        // ESTADO INVÁLIDO
        // ----------------------------------

        if (
            !this.isValidAcousticState(
                region.acousticState
            )
        ) {

            return {

                state:
                    "uncertain",

                confidence:
                    regionalConfidence,

                evidence:
                    stateEvidence,

                actionable:
                    false,

                reason:
                    "invalid-acoustic-state"
            };
        }


        // ----------------------------------
        // ESTADO AINDA NÃO SUFICIENTEMENTE
        // SUSTENTADO
        // ----------------------------------

        if (
            regionalConfidence <
            0.70
        ) {

            return {

                state:
                    "uncertain",

                confidence:
                    regionalConfidence,

                evidence:
                    stateEvidence,

                actionable:
                    false,

                reason:
                    "regional-state-needs-stronger-evidence"
            };
        }


        // ----------------------------------
        // ESTADO SUSTENTADO
        // ----------------------------------

        return {

            state:
                region.acousticState,

            confidence:
                regionalConfidence,

            evidence:
                stateEvidence,

            actionable:
                true,

            reason:
                "regional-state-supported"
        };
    }


    // ======================================
    // INTERPRETAR REGIÃO
    // ======================================

    interpretRegion(
        name,
        region,
        spectral
    ) {

        const evidence =
            this.classifyRegionalEvidence(
                region
            );


        const globalConfidence =
            this.clamp(
                this.safeNumber(
                    spectral &&
                    spectral.confidence
                ),
                0,
                1
            );


        const state =
            this.determineAcousticState(
                region
            );


        const result = {

            region:
                name,

            status:
                "observe",

            interpretation:
                "insufficient-evidence",

            evidenceLevel:
                evidence.level,

            confidence:
                region &&
                region.regionalMeasurement
                    ? state.confidence
                    : globalConfidence,

            confidenceClass:
                this.classifyConfidence(
                    region &&
                    region.regionalMeasurement
                        ? state.confidence
                        : globalConfidence
                ),

            regionSpecificEvidence:
                region
                    ? region.regionSpecificEvidence === true
                    : false,

            regionalMeasurement:
                region
                    ? region.regionalMeasurement === true
                    : false,

            acousticState:
                state.state,

            stateConfidence:
                state.confidence,

            stateEvidence:
                state.evidence,

            stateActionable:
                state.actionable,

            usableForProcessing:
                false,

            processingRecommendation:
                "none",

            reason:
                evidence.reason
        };


        // ----------------------------------
        // SEM REGIÃO
        // ----------------------------------

        if (
            !region
        ) {

            return result;
        }


        // ----------------------------------
        // SEM MEDIÇÃO REGIONAL
        // ----------------------------------

        if (
            !region.regionalMeasurement
        ) {

            result.status =
                "observe";


            result.interpretation =
                "global-context-only";


            result.acousticState =
                "contextual";


            result.processingRecommendation =
                "none";


            result.reason =
                "global-spectral-information-cannot-prove-region-specific-acoustic-state";


            return result;
        }


        // ----------------------------------
        // MEDIÇÃO REGIONAL MAS SEM
        // EVIDÊNCIA INDEPENDENTE
        // ----------------------------------

        if (
            !region.regionSpecificEvidence
        ) {

            result.status =
                "observe";


            result.interpretation =
                "regional-measurement-without-independent-evidence";


            result.acousticState =
                "uncertain";


            result.processingRecommendation =
                "none";


            result.reason =
                "regional-measurement-cannot-yet-support-an-independent-acoustic-conclusion";


            return result;
        }


        // ----------------------------------
        // EVIDÊNCIA REGIONAL NÃO UTILIZÁVEL
        // ----------------------------------

        if (
            !region.usable
        ) {

            result.status =
                "observe";


            result.interpretation =
                "regional-evidence-not-usable";


            result.acousticState =
                "uncertain";


            result.reason =
                "regional-evidence-below-actionability-threshold";


            return result;
        }


        // ----------------------------------
        // ESTADO SUSTENTADO
        // ----------------------------------

        if (
            state.actionable
        ) {

            result.status =
                "supported";


            result.interpretation =
                "regionally-supported";


            result.usableForProcessing =
                false;


            result.processingRecommendation =
                "none";


            result.reason =
                "acoustic-state-supported-but-observer-remains-analysis-only";


            return result;
        }


        // ----------------------------------
        // ESTADO NÃO SUSTENTADO
        // ----------------------------------

        result.status =
            "observe";


        result.interpretation =
            "state-not-yet-supported";


        result.processingRecommendation =
            "none";


        result.reason =
            state.reason;


        return result;
    }


    // ======================================
    // INTERPRETAR SNAPSHOT
    // ======================================

    interpretSnapshot(
        snapshot
    ) {

        if (
            !snapshot ||
            snapshot.valid !== true
        ) {

            return {

                valid:
                    false,

                status:
                    "observe",

                reason:
                    "invalid-diagnostic-snapshot",

                regions:
                    {}
            };
        }


        const spectral =
            snapshot.spectral;


        const regions =
            snapshot.regions ||
            {};


        const interpretations =
            {};


        const names =
            Object.keys(
                regions
            );


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const name =
                names[i];


            interpretations[name] =
                this.interpretRegion(
                    name,
                    regions[name],
                    spectral
                );
        }


        const analysisOnly =
            snapshot.safety &&
            snapshot.safety
                .audioProcessing ===
            false &&
            snapshot.safety
                .gainGeneration ===
            false &&
            snapshot.safety
                .filterGeneration ===
            false &&
            snapshot.safety
                .reconstruction ===
            false;


        return {

            valid:
                true,

            status:
                analysisOnly
                    ? "observe"
                    : "review",

            globalReference:
                this.safeString(
                    spectral.reference
                ),

            globalTonalDirection:
                this.safeString(
                    spectral.tonalDirection
                ),

            globalConfidence:
                this.clamp(
                    this.safeNumber(
                        spectral.confidence
                    ),
                    0,
                    1
                ),

            globalEvidence:
                this.safeString(
                    spectral.evidence,
                    "low"
                ),

            globalInfluence:
                this.clamp(
                    this.safeNumber(
                        spectral.influence
                    ),
                    0,
                    1
                ),

            ambiguous:
                this.safeBoolean(
                    spectral.ambiguous
                ),

            regionalMeasurementAvailable:
                !!snapshot.regionalMeasurement,

            regionalMeasurementConfidence:
                snapshot.regionalMeasurement
                    ? this.clamp(
                        this.safeNumber(
                            snapshot
                                .regionalMeasurement
                                .confidence
                        ),
                        0,
                        1
                    )
                    : 0,

            analysisOnly:
                analysisOnly,

            regions:
                interpretations,

            processingPermission:
                "none",

            reason:
                "diagnostic-interpretation-only"
        };
    }


    // ======================================
    // RESUMO
    // ======================================

    getSummary() {

        if (
            !this.lastSnapshot
        ) {

            return {

                available:
                    false,

                reason:
                    "no-diagnostic-available"
            };
        }


        const snapshot =
            this.lastSnapshot;


        const spectral =
            snapshot.spectral;


        const interpretation =
            this.lastInterpretation;


        return {

            available:
                true,

            valid:
                snapshot.valid ===
                true,

            reference:
                this.safeString(
                    spectral &&
                    spectral.reference
                ),

            tonalDirection:
                this.safeString(
                    spectral &&
                    spectral.tonalDirection
                ),

            confidence:
                this.clamp(
                    this.safeNumber(
                        spectral &&
                        spectral.confidence
                    ),
                    0,
                    1
                ),

            evidence:
                this.safeString(
                    spectral &&
                    spectral.evidence,
                    "low"
                ),

            ambiguous:
                spectral &&
                spectral.ambiguous ===
                true,

            regionalMeasurementAvailable:
                !!snapshot.regionalMeasurement,

            regionalMeasurementConfidence:
                snapshot.regionalMeasurement
                    ? this.clamp(
                        this.safeNumber(
                            snapshot
                                .regionalMeasurement
                                .confidence
                        ),
                        0,
                        1
                    )
                    : 0,

            analysisOnly:
                interpretation
                    ? interpretation.analysisOnly
                    : true,

            regionCount:
                snapshot.regions
                    ? Object.keys(
                        snapshot.regions
                    ).length
                    : 0,

            processingPermission:
                "none"
        };
    }


    // ======================================
    // RESUMO DOS ESTADOS REGIONAIS
    // ======================================

    getAcousticStateSummary() {

        if (
            !this.lastInterpretation ||
            !this.lastInterpretation.regions
        ) {

            return {

                available:
                    false,

                regions:
                    {}
            };
        }


        const regions =
            this.lastInterpretation
                .regions;


        const names =
            Object.keys(
                regions
            );


        const summary =
            {};


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const name =
                names[i];


            const region =
                regions[name];


            summary[name] = {

                state:
                    region.acousticState,

                confidence:
                    region.stateConfidence,

                evidence:
                    region.stateEvidence,

                supported:
                    region.stateActionable ===
                    true
            };
        }


        return {

            available:
                true,

            regions:
                summary
        };
    }


    // ======================================
    // ÚLTIMO SNAPSHOT
    // ======================================

    getLastSnapshot() {

        return this.lastSnapshot;
    }


    // ======================================
    // ÚLTIMA INTERPRETAÇÃO
    // ======================================

    getLastInterpretation() {

        return this.lastInterpretation;
    }


    // ======================================
    // OBTER INTERPRETAÇÃO REGIONAL
    // ======================================

    getRegionInterpretation(
        name
    ) {

        if (
            !this.lastInterpretation ||
            !this.lastInterpretation.regions
        ) {

            return null;
        }


        if (
            typeof name !==
            "string"
        ) {

            return null;
        }


        return (
            this.lastInterpretation
                .regions[name] ||
            null
        );
    }


    // ======================================
    // OBTER ESTADO ACÚSTICO REGIONAL
    // ======================================

    getRegionAcousticState(
        name
    ) {

        const interpretation =
            this.getRegionInterpretation(
                name
            );


        if (
            !interpretation
        ) {

            return {

                state:
                    "uncertain",

                confidence:
                    0,

                supported:
                    false
            };
        }


        return {

            state:
                this.safeString(
                    interpretation.acousticState,
                    "uncertain"
                ),

            confidence:
                this.clamp(
                    this.safeNumber(
                        interpretation.stateConfidence
                    ),
                    0,
                    1
                ),

            supported:
                interpretation.stateActionable ===
                true
        };
    }


    // ======================================
    // VERIFICAR SE É OBSERVAÇÃO PURA
    // ======================================

    isObservationOnly() {

        if (
            !this.lastSnapshot
        ) {

            return true;
        }


        const safety =
            this.lastSnapshot.safety;


        if (
            !safety
        ) {

            return true;
        }


        return (

            safety.audioProcessing !==
            true &&

            safety.gainGeneration !==
            true &&

            safety.filterGeneration !==
            true &&

            safety.reconstruction !==
            true
        );
    }


    // ======================================
    // VERIFICAR SE UM ESTADO PODE
    // PARTICIPAR DE UMA DECISÃO FUTURA
    // ======================================

    isStateSupported(
        name
    ) {

        const state =
            this.getRegionAcousticState(
                name
            );


        return (
            state.supported ===
            true
        );
    }


    // ======================================
    // EXPORTAR SNAPSHOT
    // ======================================

    exportSnapshot() {

        if (
            !this.lastSnapshot
        ) {

            return null;
        }


        try {

            return JSON.parse(
                JSON.stringify(
                    this.lastSnapshot
                )
            );

        } catch (_) {

            return null;
        }
    }


    // ======================================
    // EXPORTAR INTERPRETAÇÃO
    // ======================================

    exportInterpretation() {

        if (
            !this.lastInterpretation
        ) {

            return null;
        }


        try {

            return JSON.parse(
                JSON.stringify(
                    this.lastInterpretation
                )
            );

        } catch (_) {

            return null;
        }
    }


    // ======================================
    // RESET
    // ======================================

    reset() {

        this.lastSnapshot =
            null;


        this.lastInterpretation =
            null;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralDiagnosticObserver =
    SpectralDiagnosticObserver;