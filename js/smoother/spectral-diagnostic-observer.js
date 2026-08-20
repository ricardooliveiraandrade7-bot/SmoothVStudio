// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL DIAGNOSTIC OBSERVER
// V0.3
// ==========================================
//
// Camada de observação e interpretação
// contextual da inteligência espectral.
//
// RESPONSABILIDADE:
//
// - receber o contexto do
//   SpectralTreatmentBridge;
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
// Um estado regional somente pode ser
// considerado sustentado quando existir
// evidência específica da própria região.
//
// ==========================================


class SpectralDiagnosticObserver {


    constructor() {


        this.version =
            "0.3";


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
                )
        };
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
                    null
            };
        }


        const spectral =
            context.spectral;


        const regions =
            context.regions ||
            {};


        const snapshotRegions =
            {};


        const regionNames =
            Object.keys(
                regions
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
                    regions[name]
                );
        }


        const policy =
            context.decisionPolicy ||
            {};


        const safety =
            context.safety ||
            {};


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
        context
    ) {

        const snapshot =
            this.createSnapshot(
                context
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
    // ESTA FUNÇÃO É CONSERVADORA.
    //
    // Sem medição regional real,
    // o estado permanece "uncertain".
    //
    // O tonalDirection global NÃO pode
    // determinar elevated/recessed.
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
                    region.stateConfidence
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
                globalConfidence,

            confidenceClass:
                this.classifyConfidence(
                    globalConfidence
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