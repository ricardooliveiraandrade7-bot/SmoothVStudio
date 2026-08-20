// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL DIAGNOSTIC OBSERVER
// V0.1
// ==========================================
//
// Camada de observação da inteligência
// espectral.
//
// RESPONSABILIDADE:
//
// - receber o contexto do
//   SpectralTreatmentBridge;
// - validar a estrutura;
// - criar um snapshot seguro;
// - disponibilizar informações para
//   diagnóstico.
//
// ESTE MÓDULO NÃO:
//
// - processa áudio;
// - cria filtros;
// - altera ganho;
// - altera timbre;
// - altera o TreatmentPlan;
// - executa DSP.
//
// ==========================================


class SpectralDiagnosticObserver {


    constructor() {

        this.version =
            "0.1";


        this.lastSnapshot =
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
                    "region-unavailable"
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
                region.usable ===
                true,

            regionSpecificEvidence:
                region.regionSpecificEvidence ===
                true,

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
                    spectral.valid ===
                    true,

                reference:
                    this.safeString(
                        spectral.reference
                    ),

                tonalDirection:
                    this.safeString(
                        spectral.tonalDirection
                    ),

                confidence:
                    this.safeNumber(
                        spectral.confidence
                    ),

                evidence:
                    this.safeString(
                        spectral.evidence,
                        "low"
                    ),

                influence:
                    this.safeNumber(
                        spectral.influence
                    ),

                safety:
                    this.safeString(
                        spectral.safety,
                        "observe"
                    ),

                ambiguous:
                    spectral.ambiguous ===
                    true,

                usable:
                    spectral.usable ===
                    true
            },

            regions:
                snapshotRegions,

            decisionPolicy: {

                analysisOnly:
                    policy.analysisOnly ===
                    true,

                regionSpecificEvidenceRequired:
                    policy.regionSpecificEvidenceRequired ===
                    true,

                processingRequiresIndependentEvidence:
                    policy.processingRequiresIndependentEvidence ===
                    true,

                tonalReferenceIsNotEqPreset:
                    policy.tonalReferenceIsNotEqPreset ===
                    true
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
                    true
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


        return snapshot;
    }


    // ======================================
    // ÚLTIMO SNAPSHOT
    // ======================================

    getLastSnapshot() {

        return this.lastSnapshot;
    }


    // ======================================
    // LIMPAR
    // ======================================

    reset() {

        this.lastSnapshot =
            null;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralDiagnosticObserver =
    SpectralDiagnosticObserver;