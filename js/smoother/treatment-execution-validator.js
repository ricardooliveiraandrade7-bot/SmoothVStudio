// ==========================================
// SMOOTHVSTUDIO
// TREATMENT EXECUTION VALIDATOR
// V0.1
// ==========================================
//
// RESPONSABILIDADE:
//
// Validar uma Regional Intervention Intent
// antes de qualquer futura autorização DSP.
//
// ESTE MÓDULO É OBSERVACIONAL.
//
// NÃO:
//
// - processa AudioBuffer;
// - cria AudioNode;
// - aplica EQ;
// - aplica compressão;
// - aplica de-essing;
// - altera ganho;
// - altera timbre;
// - libera DSP.
//
// Fluxo:
//
// Regional Intervention Intent
//              ↓
//      Execution Validator
//              ↓
//      validation result
//
// ==========================================


class TreatmentExecutionValidator {


    constructor(
        options = {}
    ) {


        this.version =
            "0.1";


        this.limits = {

            maxGainDb:
                this.safeNumber(
                    options.maxGainDb,
                    2
                ),

            maxCutDb:
                this.safeNumber(
                    options.maxCutDb,
                    -2
                ),

            minEvidence:
                this.safeNumber(
                    options.minEvidence,
                    1
                )
        };


        this.allowedStates = [
            "candidate",
            "preserve",
            "blocked"
        ];


        this.allowedTreatments = [

            "none",

            "eq",
            "spectral",
            "spectral-balance",

            "de-esser",
            "dynamics",

            "body",
            "tone",

            "presence",
            "air"
        ];
    }


    // ======================================
    // UTILITÁRIOS
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


    isObject(
        value
    ) {

        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }


    isArray(
        value
    ) {

        return Array.isArray(
            value
        );
    }


    safeString(
        value,
        fallback = ""
    ) {

        return typeof value === "string"
            ? value.trim()
            : fallback;
    }


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


    normalizeState(
        value
    ) {

        const state =
            this.safeString(
                value,
                "blocked"
            ).toLowerCase();


        if (
            this.allowedStates.includes(
                state
            )
        ) {

            return state;
        }


        return "blocked";
    }


    normalizeTreatment(
        value
    ) {

        const treatment =
            this.safeString(
                value,
                "none"
            ).toLowerCase();


        if (
            this.allowedTreatments.includes(
                treatment
            )
        ) {

            return treatment;
        }


        return "none";
    }


    extractEvidence(
        intent
    ) {

        if (
            !this.isObject(
                intent
            )
        ) {

            return [];
        }


        if (
            this.isArray(
                intent.evidence
            )
        ) {

            return [
                ...intent.evidence
            ];
        }


        if (
            this.isArray(
                intent.evidenceList
            )
        ) {

            return [
                ...intent.evidenceList
            ];
        }


        return [];
    }


    extractGainDb(
        intent
    ) {

        if (
            !this.isObject(
                intent
            )
        ) {

            return 0;
        }


        const candidates = [

            intent.requestedGainDb,

            intent.gainDb,

            intent.boundedGainDb,

            intent.amountDb
        ];


        for (
            let i = 0;
            i < candidates.length;
            i++
        ) {

            const value =
                Number(
                    candidates[i]
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                return value;
            }
        }


        return 0;
    }


    // ======================================
    // VALIDAR
    // ======================================


    validate(
        intent
    ) {

        const baseResult = {

            version:
                this.version,

            valid:
                false,

            executable:
                false,

            observationOnly:
                true,

            processingPermission:
                "none",

            audioProcessing:
                false,

            reconstructionPermission:
                "none",

            state:
                "blocked",

            reasons:
                [],

            evidenceCount:
                0,

            requestedGainDb:
                0,

            boundedGainDb:
                0
        };


        // ----------------------------------
        // INTENT INVÁLIDA
        // ----------------------------------

        if (
            !this.isObject(
                intent
            )
        ) {

            baseResult.reasons.push(
                "intent-invalid"
            );


            return baseResult;
        }


        const state =
            this.normalizeState(
                intent.state
            );


        const treatmentType =
            this.normalizeTreatment(
                intent.treatmentType
            );


        const region =
            this.safeString(
                intent.region,
                ""
            );


        const evidence =
            this.extractEvidence(
                intent
            );


        const requestedGainDb =
            this.extractGainDb(
                intent
            );


        const boundedGainDb =
            this.clamp(
                requestedGainDb,
                this.limits.maxCutDb,
                this.limits.maxGainDb
            );


        baseResult.state =
            state;


        baseResult.evidenceCount =
            evidence.length;


        baseResult.requestedGainDb =
            requestedGainDb;


        baseResult.boundedGainDb =
            boundedGainDb;


        // ----------------------------------
        // PRESERVAÇÃO
        // ----------------------------------

        if (
            state === "preserve"
        ) {

            baseResult.valid =
                true;


            baseResult.reasons.push(
                "preserve-state"
            );


            return baseResult;
        }


        // ----------------------------------
        // BLOQUEIO EXPLÍCITO
        // ----------------------------------

        if (
            state === "blocked"
        ) {

            baseResult.reasons.push(
                "intent-blocked"
            );


            return baseResult;
        }


        // ----------------------------------
        // REGIÃO OBRIGATÓRIA
        // ----------------------------------

        if (
            !region
        ) {

            baseResult.reasons.push(
                "region-missing"
            );
        }


        // ----------------------------------
        // TRATAMENTO OBRIGATÓRIO
        // ----------------------------------

        if (
            treatmentType === "none"
        ) {

            baseResult.reasons.push(
                "treatment-missing"
            );
        }


        // ----------------------------------
        // EVIDÊNCIA MÍNIMA
        // ----------------------------------

        if (
            evidence.length <
            this.limits.minEvidence
        ) {

            baseResult.reasons.push(
                "insufficient-evidence"
            );
        }


        // ----------------------------------
        // GANHO FORA DO LIMITE
        // ----------------------------------

        if (
            requestedGainDb <
            this.limits.maxCutDb ||
            requestedGainDb >
            this.limits.maxGainDb
        ) {

            baseResult.reasons.push(
                "gain-out-of-bounds"
            );
        }


        // ----------------------------------
        // RESULTADO
        // ----------------------------------

        baseResult.valid =
            baseResult.reasons.length === 0;


        /*
         * IMPORTANTE:
         *
         * Mesmo quando a intenção é válida,
         * a V0.1 continua sem autorização DSP.
         *
         * Portanto:
         *
         * valid !== executable
         *
         */

        baseResult.executable =
            false;


        baseResult.processingPermission =
            "none";


        baseResult.audioProcessing =
            false;


        return baseResult;
    }
}


// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================


if (
    typeof window !== "undefined"
) {

    window.TreatmentExecutionValidator =
        TreatmentExecutionValidator;
}