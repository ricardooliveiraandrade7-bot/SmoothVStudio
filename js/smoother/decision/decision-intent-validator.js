// ==========================================
// SMOOTHVSTUDIO
// DECISION INTENT VALIDATOR
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Validar uma única intenção regional.
//
// Este módulo NÃO:
// - cria intenções;
// - altera decisões;
// - executa DSP;
// - altera AudioBuffer;
// - executa processamento de áudio.
//
// ==========================================


class TreatmentDecisionIntentValidator {


    // ======================================
    // VALIDAR INTENÇÃO REGIONAL
    // ======================================

    static validateRegionalInterventionIntent(
        intent,
        authority,
        helpers = {}
    ) {

        const isObject =
            typeof helpers.isObject ===
            "function"
                ? helpers.isObject
                : (
                    input
                ) => {

                    return !!(
                        input &&
                        typeof input ===
                            "object"
                    );
                };


        const isFiniteNumber =
            typeof helpers.isFiniteNumber ===
            "function"
                ? helpers.isFiniteNumber
                : (
                    input
                ) => {

                    return (
                        typeof input ===
                            "number" &&
                        Number.isFinite(
                            input
                        )
                    );
                };


        const validateBoundedAuthority =
            typeof helpers.validateBoundedAuthority ===
            "function"
                ? helpers.validateBoundedAuthority
                : (
                    input
                ) => {

                    return {
                        valid: true,
                        errors: []
                    };
                };


        const errors = [];


        if (
            !isObject(
                intent
            )
        ) {

            errors.push(
                "Intenção regional ausente."
            );


            return {

                valid:
                    false,

                errors
            };
        }


        if (
            intent.state !==
                "preserve" &&
            intent.state !==
                "candidate" &&
            intent.state !==
                "blocked"
        ) {

            errors.push(
                "Estado da intenção regional inválido."
            );
        }


        if (
            intent.executionPermission !==
            "none"
        ) {

            errors.push(
                "Intenção regional não pode autorizar execução."
            );
        }


        if (
            intent.processingPermission !==
            "none"
        ) {

            errors.push(
                "Intenção regional não pode liberar processamento."
            );
        }


        if (
            intent.audioProcessing !==
            false
        ) {

            errors.push(
                "Intenção regional não pode executar processamento de áudio."
            );
        }


        if (
            !isObject(
                intent.decisionAuthority
            )
        ) {

            errors.push(
                "Intenção regional sem autoridade de decisão."
            );

        } else {

            const authorityValidation =
                validateBoundedAuthority(
                    intent.decisionAuthority
                );


            if (
                !authorityValidation.valid
            ) {

                errors.push(
                    ...authorityValidation.errors
                );
            }
        }


        if (
            intent.state ===
            "candidate"
        ) {

            if (
                !isObject(
                    intent.region
                )
            ) {

                errors.push(
                    "Intenção candidata sem região."
                );
            }


            if (
                intent.treatmentType ===
                "none"
            ) {

                errors.push(
                    "Intenção candidata sem tratamento definido."
                );
            }


            if (
                intent.confidence ===
                    "weak" ||
                intent.confidence ===
                    "indeterminate"
            ) {

                errors.push(
                    "Intenção candidata possui confiança insuficiente."
                );
            }
        }


        if (
            !isFiniteNumber(
                intent.requestedGainDb
            )
        ) {

            errors.push(
                "requestedGainDb inválido."
            );
        }


        if (
            !isFiniteNumber(
                intent.boundedGainDb
            )
        ) {

            errors.push(
                "boundedGainDb inválido."
            );
        }


        if (
            authority &&
            authority.limits
        ) {

            const min =
                authority.limits.maxCutDb;


            const max =
                authority.limits.maxGainDb;


            if (
                isFiniteNumber(
                    min
                ) &&
                isFiniteNumber(
                    max
                )
            ) {

                if (
                    intent.boundedGainDb <
                    min ||
                    intent.boundedGainDb >
                    max
                ) {

                    errors.push(
                        "boundedGainDb ultrapassa o orçamento de autoridade."
                    );
                }
            }


            if (
                authority.limits.regionalOnly !==
                true
            ) {

                errors.push(
                    "Autoridade regional não está restrita a regiões."
                );
            }
        }


        if (
            intent.fallback !==
            "preserve"
        ) {

            errors.push(
                "Fallback da intenção regional deve ser preserve."
            );
        }


        return {

            valid:
                errors.length ===
                0,

            errors
        };
    }
}


// ==========================================
// EXPOSIÇÃO GLOBAL
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.TreatmentDecisionIntentValidator =
        TreatmentDecisionIntentValidator;
}