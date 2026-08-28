// ==========================================
// SMOOTHVSTUDIO
// DECISION AUTHORITY VALIDATOR
// V0.1
// ==========================================
//
// Responsabilidade:
//
// Validar uma autoridade "bounded" e seus
// limites de segurança.
//
// Este módulo NÃO:
// - cria autoridades;
// - altera autoridades;
// - executa DSP;
// - executa processamento de áudio;
// - decide tratamentos.
//
// ==========================================


class TreatmentDecisionAuthorityValidator {


    // ======================================
    // VALIDAR AUTORIDADE BOUNDED
    // ======================================

    static validateBoundedAuthority(
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


        const errors = [];


        if (
            !isObject(
                authority
            )
        ) {

            errors.push(
                "Autoridade ausente."
            );


            return {

                valid:
                    false,

                errors
            };
        }


        if (
            authority.level !==
            "bounded"
        ) {

            errors.push(
                "Nível de autoridade inválido."
            );
        }


        if (
            authority.processingPermission !==
            "none"
        ) {

            errors.push(
                "Autoridade bounded não pode liberar processamento."
            );
        }


        if (
            authority.audioProcessing !==
            false
        ) {

            errors.push(
                "Autoridade bounded não pode liberar processamento de áudio."
            );
        }


        if (
            authority.reconstructionPermission !==
            "none"
        ) {

            errors.push(
                "Autoridade bounded não pode liberar reconstrução."
            );
        }


        if (
            authority.executorPermission !==
            "none"
        ) {

            errors.push(
                "Autoridade bounded não pode liberar executor."
            );
        }


        if (
            !isObject(
                authority.limits
            )
        ) {

            errors.push(
                "Autoridade bounded sem limites."
            );


            return {

                valid:
                    false,

                errors
            };
        }


        const limits =
            authority.limits;


        if (
            !isFiniteNumber(
                limits.maxGainDb
            )
        ) {

            errors.push(
                "maxGainDb inválido."
            );
        }


        if (
            !isFiniteNumber(
                limits.maxCutDb
            )
        ) {

            errors.push(
                "maxCutDb inválido."
            );
        }


        if (
            !Number.isInteger(
                limits.maxInterventions
            ) ||
            limits.maxInterventions <
            0
        ) {

            errors.push(
                "maxInterventions inválido."
            );
        }


        if (
            limits.regionalOnly !==
            true
        ) {

            errors.push(
                "Autoridade bounded deve ser regional."
            );
        }


        if (
            limits.globalProcessing !==
            false
        ) {

            errors.push(
                "Autoridade bounded não pode liberar processamento global."
            );
        }


        if (
            limits.reconstruction !==
            false
        ) {

            errors.push(
                "Autoridade bounded não pode liberar reconstrução."
            );
        }


        if (
            limits.saturation !==
            false
        ) {

            errors.push(
                "Autoridade bounded não pode liberar saturação."
            );
        }


        if (
            limits.dynamicsExpansion !==
            false
        ) {

            errors.push(
                "Autoridade bounded não pode liberar expansão dinâmica."
            );
        }


        if (
            limits.uncontrolledDeEssing !==
            false
        ) {

            errors.push(
                "Autoridade bounded não pode liberar de-essing não controlado."
            );
        }



        if (
            authority.fallback !==
            "preserve"
        ) {

            errors.push(
                "Fallback da autoridade bounded deve ser preserve."
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

    window.TreatmentDecisionAuthorityValidator =
        TreatmentDecisionAuthorityValidator;
}