// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL DIAGNOSTIC OBSERVER
// V0.2
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
// - disponibilizar diagnóstico;
// - interpretar a qualidade da evidência;
// - distinguir evidência global de
//   evidência específica de região.
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
// ==========================================


class SpectralDiagnosticObserver {


    constructor() {


        this.version =
            "0.2";


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
                    "unknown"
            };
        }


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
    // INTERPRETAR REGIÃO
    // ======================================
    //
    // Esta função NÃO determina EQ.
    //
    // Ela somente determina o estado
    // epistemológico da informação:
    //
    // O que sabemos?
    // O que não sabemos?
    // Podemos considerar essa informação
    // para uma futura decisão?
    //
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
        // EVIDÊNCIA APENAS GLOBAL
        // ----------------------------------

        if (
            !region.regionSpecificEvidence
        ) {

            result.status =
                "observe";


            result.interpretation =
                "global-context-only";


            result.processingRecommendation =
                "none";


            result.reason =
                "global-spectral-information-cannot-prove-region-specific-problem";


            return result;
        }


        // ----------------------------------
        // REGIÃO ESPECÍFICA DISPONÍVEL
        // ----------------------------------

        if (
            !region.usable
        ) {

            result.status =
                "observe";


            result.interpretation =
                "regional-evidence-not-usable";


            result.reason =
                "regional-evidence-below-actionability-threshold";


            return result;
        }


        const regionalConfidence =
            this.clamp(
                this.safeNumber(
                    region.confidence
                ),
                0,
                1
            );


        result.confidence =
            regionalConfidence;


        result.confidenceClass =
            this.classifyConfidence(
                regionalConfidence
            );


        // ----------------------------------
        // EVIDÊNCIA FRACA
        // ----------------------------------

        if (
            regionalConfidence <
            0.40
        ) {

            result.status =
                "observe";


            result.interpretation =
                "weak-regional-evidence";


            result.reason =
                "regional-confidence-too-low";


            return result;
        }


        // ----------------------------------
        // EVIDÊNCIA MODERADA
        // ----------------------------------

        if (
            regionalConfidence <
            0.70
        ) {

            result.status =
                "cautious";


            result.interpretation =
                "supported-but-cautious";


            result.reason =
                "regional-evidence-present-but-not-strong-enough-for-automatic-processing";


            return result;
        }


        // ----------------------------------
        // EVIDÊNCIA FORTE
        // ----------------------------------

        result.status =
            "supported";


        result.interpretation =
            "regionally-supported";


        result.reason =
            "region-specific-evidence-is-available";


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