// ==========================================
// SMOOTHVSTUDIO
// TREATMENT DECISION PIPELINE
// V0.3
// ==========================================
//
// Responsabilidade:
//
// Orquestrar, de forma observacional,
// as camadas de:
//
// Treatment Plan
//       ↓
// Treatment Plan Validator
//       ↓
// Treatment Decision Gate
//       ↓
// Treatment Decision Record
//       ↓
// Bounded Authority
//       ↓
// Regional Intervention Intent
//
// ==========================================
//
// IMPORTANTE:
//
// Este módulo NÃO:
//
// - analisa áudio
// - modifica AudioBuffer
// - aplica EQ
// - cria filtros
// - altera ganho
// - executa DSP
// - reconstrói espectro
// - executa tratamento
//
// Sua responsabilidade é transformar decisões
// diagnósticas em contratos seguros e
// rastreáveis para futuras etapas.
//
// ==========================================
//
// REGRA FUNDAMENTAL:
//
// DECISION PIPELINE ≠ DSP PIPELINE
//
// Uma decisão válida continua sem autoridade
// para processar áudio.
//
// processingPermission = "none"
// audioProcessing = false
//
// ==========================================
//
// AUTORIDADE PROGRESSIVA
//
// authority.level = "bounded"
//
// Porém:
//
// processingPermission = "none"
//
// Portanto:
//
// "bounded" NÃO significa que o DSP
// está autorizado a executar.
//
// ==========================================
//
// INTERVENTION INTENT
//
// Esta versão introduz:
//
// regionalInterventionIntent
//
// Estados:
//
// preserve
// candidate
// blocked
//
// A intenção é apenas descritiva.
//
// executionPermission = "none"
//
// ==========================================


class TreatmentDecisionPipeline {


    constructor(
        options = {}
    ) {


        this.version =
            "0.3";


        // ==================================
        // DEPENDÊNCIAS
        // ==================================

        this.validator =
            options.validator || null;


        this.decisionGate =
            options.decisionGate || null;


        this.decisionRecord =
            options.decisionRecord || null;


        // ==================================
        // HARD LOCK
        // ==================================

        this.processingPermission =
            "none";


        this.audioProcessing =
            false;


        this.reconstructionPermission =
            "none";


        // ==================================
        // AUTORIDADE BOUNDED
        // ==================================

        this.authorityProfile =
            this.createBoundedAuthority();
    }


    // ======================================
    // OBJETO
    // ======================================

    isObject(
        value
    ) {

        return !!(
            value &&
            typeof value ===
                "object"
        );
    }


    // ======================================
    // ARRAY
    // ======================================

    isArray(
        value
    ) {

        return Array.isArray(
            value
        );
    }


    // ======================================
    // TEXTO
    // ======================================

    safeString(
        value,
        fallback = ""
    ) {

        if (
            typeof value !==
            "string"
        ) {

            return fallback;
        }


        return value.trim();
    }


    // ======================================
    // NÚMERO FINITO
    // ======================================

    isFiniteNumber(
        value
    ) {

        return (
            typeof value ===
                "number" &&
            Number.isFinite(
                value
            )
        );
    }


    // ======================================
    // CLAMP NUMÉRICO
    // ======================================

    clamp(
        value,
        min,
        max
    ) {

        if (
            !this.isFiniteNumber(
                value
            )
        ) {

            return min;
        }


        return Math.min(
            max,
            Math.max(
                min,
                value
            )
        );
    }


    // ======================================
    // CRIAR AUTORIDADE BOUNDED
    // ======================================

    createBoundedAuthority() {

        return {

            level:
                "bounded",

            processingPermission:
                "none",

            audioProcessing:
                false,

            reconstructionPermission:
                "none",

            executorPermission:
                "none",

            limits: {

                maxGainDb:
                    2,

                maxCutDb:
                    -2,

                maxInterventions:
                    1,

                regionalOnly:
                    true,

                globalProcessing:
                    false,

                reconstruction:
                    false,

                saturation:
                    false,

                dynamicsExpansion:
                    false,

                uncontrolledDeEssing:
                    false
            },

            fallback:
                "preserve"
        };
    }


    // ======================================
    // CLONAR AUTORIDADE
    // ======================================

    cloneAuthority(
        authority
    ) {

        if (
            !this.isObject(
                authority
            )
        ) {

            return this.createBoundedAuthority();
        }


        return {

            ...authority,

            limits: {

                ...(
                    this.isObject(
                        authority.limits
                    )
                        ? authority.limits
                        : {}
                )
            }
        };
    }


    // ======================================
    // RESOLVER AUTORIDADE DO DECISION RECORD
    // ======================================

    resolveDecisionAuthority(
        record,
        fallbackAuthority
    ) {

        if (
            this.isObject(
                record
            ) &&
            this.isObject(
                record.authority
            )
        ) {

            return this.cloneAuthority(
                record.authority
            );
        }


        return this.cloneAuthority(
            fallbackAuthority
        );
    }


    // ======================================
    // CRIAR INTENÇÃO REGIONAL
    // ======================================

    createRegionalInterventionIntent(
        options = {}
    ) {

        const state =
            this.safeString(
                options.state,
                "preserve"
            );


        const normalizedState =
            (
                state === "candidate" ||
                state === "blocked" ||
                state === "preserve"
            )
                ? state
                : "blocked";


        return {

            state:
                normalizedState,

            decisionAuthority:
                this.cloneAuthority(
                    options.decisionAuthority
                ),

            executionPermission:
                "none",

            processingPermission:
                "none",

            audioProcessing:
                false,

            region:
                options.region || null,

            treatmentType:
                this.safeString(
                    options.treatmentType,
                    "none"
                ),

            confidence:
                this.safeString(
                    options.confidence,
                    "indeterminate"
                ),

            evidence:
                this.isArray(
                    options.evidence
                )
                    ? [
                        ...options.evidence
                    ]
                    : [],

            rationale:
                this.safeString(
                    options.rationale,
                    ""
                ),

            requestedGainDb:
                this.isFiniteNumber(
                    options.requestedGainDb
                )
                    ? options.requestedGainDb
                    : 0,

            boundedGainDb:
                this.isFiniteNumber(
                    options.boundedGainDb
                )
                    ? options.boundedGainDb
                    : 0,

            fallback:
                "preserve"
        };
    }


    // ======================================
    // NORMALIZAR REGIÃO
    // ======================================

    normalizeRegion(
        value
    ) {

        if (
            typeof value ===
            "string"
        ) {

            const name =
                this.safeString(
                    value
                );


            if (
                !name
            ) {

                return null;
            }


            return {

                id:
                    name,

                name:
                    name
            };
        }


        if (
            this.isObject(
                value
            )
        ) {

            const id =
                this.safeString(
                    value.id ||
                    value.key ||
                    value.name,
                    "unknown"
                );


            const name =
                this.safeString(
                    value.name ||
                    value.label ||
                    id,
                    id
                );


            return {

                id,

                name
            };
        }


        return null;
    }


    // ======================================
    // EXTRAIR REGIÃO DO REGISTRO
    // ======================================

    extractRegionFromRecord(
        record
    ) {

        if (
            !this.isObject(
                record
            )
        ) {

            return null;
        }


        return this.normalizeRegion(
            record.region ||
            record.regionResult ||
            record.regionData ||
            record.targetRegion ||
            record.area ||
            record.frequencyRegion ||
            null
        );
    }


    // ======================================
    // EXTRAIR TIPO DE TRATAMENTO
    // ======================================

    extractTreatmentType(
        record
    ) {

        if (
            !this.isObject(
                record
            )
        ) {

            return "none";
        }


        const decision =
            this.isObject(
                record.decision
            )
                ? record.decision
                : {};


        return this.safeString(
            record.treatmentType ||
            record.treatment ||
            record.actionType ||
            decision.treatmentType ||
            decision.treatment ||
            decision.type ||
            decision.actionType ||
            "none",
            "none"
        );
    }


    // ======================================
    // EXTRAIR CONFIANÇA
    // ======================================

    extractConfidence(
        record
    ) {

        if (
            !this.isObject(
                record
            )
        ) {

            return "indeterminate";
        }


        const decision =
            this.isObject(
                record.decision
            )
                ? record.decision
                : {};


        const value =
            record.confidence ||
            record.decisionConfidence ||
            decision.confidence ||
            record.evidenceConfidence ||
            null;


        if (
            typeof value ===
            "number"
        ) {

            if (
                value >= 0.8
            ) {

                return "strong";
            }


            if (
                value >= 0.5
            ) {

                return "moderate";
            }


            if (
                value > 0
            ) {

                return "weak";
            }


            return "indeterminate";
        }


        const text =
            this.safeString(
                value,
                "indeterminate"
            )
                .toLowerCase();


        if (
            text === "strong" ||
            text === "forte"
        ) {

            return "strong";
        }


        if (
            text === "moderate" ||
            text === "moderada"
        ) {

            return "moderate";
        }


        if (
            text === "weak" ||
            text === "fraca"
        ) {

            return "weak";
        }


        return "indeterminate";
    }


    // ======================================
    // EXTRAIR EVIDÊNCIAS
    // ======================================

    extractEvidence(
        record
    ) {

        if (
            !this.isObject(
                record
            )
        ) {

            return [];
        }


        const sources = [

            record.evidence,

            record.evidenceList,

            record.supportingEvidence,

            record.observations,

            record.diagnostics,

            record.measurements,

            record.decision &&
            record.decision.evidence
        ];


        for (
            let i = 0;
            i < sources.length;
            i++
        ) {

            if (
                this.isArray(
                    sources[i]
                )
            ) {

                return [
                    ...sources[i]
                ];
            }
        }


        return [];
    }


    // ======================================
    // EXTRAIR GANHO SOLICITADO
    // ======================================

    extractRequestedGainDb(
        record
    ) {

        if (
            !this.isObject(
                record
            )
        ) {

            return 0;
        }


        const decision =
            this.isObject(
                record.decision
            )
                ? record.decision
                : {};


        const candidates = [

            record.requestedGainDb,

            record.gainDb,

            record.recommendedGainDb,

            record.amountDb,

            decision.requestedGainDb,

            decision.gainDb,

            decision.recommendedGainDb,

            decision.amountDb
        ];


        for (
            let i = 0;
            i < candidates.length;
            i++
        ) {

            if (
                this.isFiniteNumber(
                    candidates[i]
                )
            ) {

                return candidates[i];
            }
        }


        return 0;
    }


    // ======================================
    // IDENTIFICAR PRESERVAÇÃO
    // ======================================

    isPreserveRecord(
        record
    ) {

        if (
            !this.isObject(
                record
            )
        ) {

            return true;
        }


        const decision =
            this.isObject(
                record.decision
            )
                ? record.decision
                : {};


        const actions = [

            record.action,

            record.decisionAction,

            record.recommendation,

            decision.action,

            decision.recommendation
        ];


        for (
            let i = 0;
            i < actions.length;
            i++
        ) {

            const action =
                this.safeString(
                    actions[i],
                    ""
                )
                    .toLowerCase();


            if (
                action ===
                    "preserve" ||
                action ===
                    "preservar"
            ) {

                return true;
            }
        }


        return false;
    }


    // ======================================
    // CRIAR INTENÇÃO A PARTIR DE REGISTRO
    // ======================================

    createIntentFromRecord(
        record,
        authority
    ) {

        if (
            !this.isObject(
                record
            )
        ) {

            return this.createRegionalInterventionIntent({

                state:
                    "blocked",

                decisionAuthority,

                rationale:
                    "Registro de decisão inválido."
            });
        }


        if (
            this.isPreserveRecord(
                record
            )
        ) {

            return this.createRegionalInterventionIntent({

                state:
                    "preserve",

                decisionAuthority,

                region:
                    this.extractRegionFromRecord(
                        record
                    ),

                treatmentType:
                    "none",

                confidence:
                    this.extractConfidence(
                        record
                    ),

                evidence:
                    this.extractEvidence(
                        record
                    ),

                rationale:
                    "Decisão indica preservação."
            });
        }


        const decisionAuthority =
            this.resolveDecisionAuthority(
                record,
                authority
            );


        const region =
            this.extractRegionFromRecord(
                record
            );


        const treatmentType =
            this.extractTreatmentType(
                record
            );


        const confidence =
            this.extractConfidence(
                record
            );


        const evidence =
            this.extractEvidence(
                record
            );


        const requestedGainDb =
            this.extractRequestedGainDb(
                record
            );


        // ==================================
        // SEM REGIÃO
        // ==================================

        if (
            !region
        ) {

            return this.createRegionalInterventionIntent({

                state:
                    "blocked",

                treatmentType,

                confidence,

                evidence,

                requestedGainDb,

                rationale:
                    "Intervenção sem região explicitamente identificável."
            });
        }


        // ==================================
        // SEM TRATAMENTO
        // ==================================

        if (
            treatmentType ===
            "none"
        ) {

            return this.createRegionalInterventionIntent({

                state:
                    "blocked",

                region,

                treatmentType,

                confidence,

                evidence,

                requestedGainDb,

                rationale:
                    "Nenhum tipo de tratamento explicitamente identificado."
            });
        }


        // ==================================
        // CONFIANÇA INSUFICIENTE
        // ==================================

        if (
            confidence ===
                "weak" ||
            confidence ===
                "indeterminate"
        ) {

            return this.createRegionalInterventionIntent({

                state:
                    "blocked",

                region,

                treatmentType,

                confidence,

                evidence,

                requestedGainDb,

                rationale:
                    "Confiança insuficiente para formar intenção de intervenção."
            });
        }


        // ==================================
        // LIMITAÇÃO DO GANHO
        // ==================================

        const maxGain =
            authority &&
            authority.limits &&
            this.isFiniteNumber(
                authority.limits.maxGainDb
            )
                ? authority.limits.maxGainDb
                : 2;


        const maxCut =
            authority &&
            authority.limits &&
            this.isFiniteNumber(
                authority.limits.maxCutDb
            )
                ? authority.limits.maxCutDb
                : -2;


        const boundedGain =
            this.clamp(
                requestedGainDb,
                maxCut,
                maxGain
            );


        // ==================================
        // INTENÇÃO CANDIDATA
        // ==================================

        return this.createRegionalInterventionIntent({

            state:
                "candidate",

            region,

            treatmentType,

            confidence,

            evidence,

            requestedGainDb,

            boundedGainDb:
                boundedGain,

            rationale:
                "Existe evidência suficiente para uma possível intervenção regional limitada; execução permanece bloqueada."
        });
    }


    // ======================================
    // CRIAR INTENÇÕES REGIONAIS
    // ======================================

    buildRegionalInterventionIntents(
        recordResult,
        authority
    ) {

        const records =
            recordResult &&
            this.isArray(
                recordResult.records
            )
                ? recordResult.records
                : [];


        const intents = [];


        const maxInterventions =
            authority &&
            authority.limits &&
            Number.isInteger(
                authority.limits.maxInterventions
            )
                ? authority.limits.maxInterventions
                : 1;


        for (
            let i = 0;
            i < records.length;
            i++
        ) {

            if (
                intents.length >=
                maxInterventions
            ) {

                break;
            }


            const intent =
                this.createIntentFromRecord(
                    records[i],
                    authority
                );


            intents.push(
                intent
            );
        }


        if (
            intents.length ===
            0
        ) {

            intents.push(
                this.createRegionalInterventionIntent({

                    state:
                        "preserve",

                    decisionAuthority:
                        authority,

                    rationale:
                        "Nenhum registro de decisão gerou intenção regional."
                })
            );
        }


        return intents;
    }


    // ======================================
    // VALIDAR INTENÇÃO REGIONAL
    // ======================================

    validateRegionalInterventionIntent(
        intent,
        authority
    ) {

        const errors = [];


        if (
            !this.isObject(
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
            !this.isObject(
                intent.decisionAuthority
            )
        ) {

            errors.push(
                "Intenção regional sem decisionAuthority."
            );

        } else {

            if (
                intent.decisionAuthority.level !==
                "bounded"
            ) {

                errors.push(
                    "decisionAuthority deve possuir level bounded."
                );
            }


            if (
                intent.decisionAuthority.processingPermission !==
                "none"
            ) {

                errors.push(
                    "decisionAuthority não pode liberar processamento."
                );
            }


            if (
                intent.decisionAuthority.audioProcessing !==
                false
            ) {

                errors.push(
                    "decisionAuthority não pode liberar processamento de áudio."
                );
            }


            if (
                intent.decisionAuthority.reconstructionPermission !==
                "none"
            ) {

                errors.push(
                    "decisionAuthority não pode liberar reconstrução."
                );
            }


            if (
                intent.decisionAuthority.executorPermission !==
                "none"
            ) {

                errors.push(
                    "decisionAuthority não pode liberar executor."
                );
            }
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
            intent.state ===
            "candidate"
        ) {

            if (
                !this.isObject(
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
            !this.isFiniteNumber(
                intent.requestedGainDb
            )
        ) {

            errors.push(
                "requestedGainDb inválido."
            );
        }


        if (
            !this.isFiniteNumber(
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
                this.isFiniteNumber(
                    min
                ) &&
                this.isFiniteNumber(
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


    // ======================================
    // VALIDAR TODAS AS INTENÇÕES
    // ======================================

    validateRegionalInterventionIntents(
        intents,
        authority
    ) {

        const errors = [];


        if (
            !this.isArray(
                intents
            )
        ) {

            return {

                valid:
                    false,

                errors: [
                    "Lista de intenções regionais inválida."
                ]
            };
        }


        const maxInterventions =
            authority &&
            authority.limits &&
            authority.limits.maxInterventions;


        if (
            Number.isInteger(
                maxInterventions
            ) &&
            intents.length >
            maxInterventions
        ) {

            errors.push(
                "Número de intenções excede o orçamento bounded."
            );
        }


        intents.forEach(
            intent => {

                const validation =
                    this.validateRegionalInterventionIntent(
                        intent,
                        authority
                    );


                if (
                    !validation.valid
                ) {

                    errors.push(
                        ...validation.errors
                    );
                }
            }
        );


        return {

            valid:
                errors.length ===
                0,

            errors
        };
    }


    // ======================================
    // CRIAR RESULTADO DE ETAPA
    // ======================================

    createStage(
        name
    ) {

        return {

            name,

            executed:
                false,

            valid:
                false,

            available:
                false,

            errors:
                [],

            warnings:
                []
        };
    }


    // ======================================
    // REGISTRAR ERRO
    // ======================================

    addError(
        stage,
        message
    ) {

        if (
            !stage ||
            !this.isObject(
                stage
            )
        ) {

            return;
        }


        stage.errors.push(
            this.safeString(
                message,
                "unknown-error"
            )
        );
    }


    // ======================================
    // REGISTRAR WARNING
    // ======================================

    addWarning(
        stage,
        message
    ) {

        if (
            !stage ||
            !this.isObject(
                stage
            )
        ) {

            return;
        }


        stage.warnings.push(
            this.safeString(
                message,
                "unknown-warning"
            )
        );
    }


    // ======================================
    // RESOLVER VALIDATOR
    // ======================================

    resolveValidator() {

        if (
            this.validator
        ) {

            return this.validator;
        }


        if (
            typeof window !==
                "undefined" &&
            typeof window.TreatmentPlanValidator ===
                "function"
        ) {

            try {

                return new window
                    .TreatmentPlanValidator();

            } catch (
                error
            ) {

                return null;
            }
        }


        return null;
    }


    // ======================================
    // RESOLVER DECISION GATE
    // ======================================

    resolveDecisionGate() {

        if (
            this.decisionGate
        ) {

            return this.decisionGate;
        }


        if (
            typeof window !==
                "undefined" &&
            typeof window.TreatmentDecisionGate ===
                "function"
        ) {

            try {

                return new window
                    .TreatmentDecisionGate();

            } catch (
                error
            ) {

                return null;
            }
        }


        return null;
    }


    // ======================================
    // RESOLVER DECISION RECORD
    // ======================================

    resolveDecisionRecord() {

        if (
            this.decisionRecord
        ) {

            return this.decisionRecord;
        }


        if (
            typeof window !==
                "undefined" &&
            typeof window.TreatmentDecisionRecord ===
                "function"
        ) {

            try {

                return new window
                    .TreatmentDecisionRecord();

            } catch (
                error
            ) {

                return null;
            }
        }


        return null;
    }


    // ======================================
    // VALIDAR DEPENDÊNCIAS
    // ======================================

    validateDependencies(
        requireDecisionRecord = false
    ) {

        const result = {

            valid:
                true,

            validator:
                false,

            decisionGate:
                false,

            decisionRecord:
                false,

            decisionRecordRequired:
                requireDecisionRecord,

            errors:
                []
        };


        const validator =
            this.resolveValidator();


        const gate =
            this.resolveDecisionGate();


        const record =
            this.resolveDecisionRecord();


        result.validator =
            !!(
                validator
            );


        result.decisionGate =
            !!(
                gate
            );


        result.decisionRecord =
            !!(
                record
            );


        if (
            !validator
        ) {

            result.valid =
                false;

            result.errors.push(
                "TreatmentPlanValidator indisponível."
            );
        }


        if (
            !gate
        ) {

            result.valid =
                false;

            result.errors.push(
                "TreatmentDecisionGate indisponível."
            );
        }


        if (
            requireDecisionRecord &&
            !record
        ) {

            result.valid =
                false;

            result.errors.push(
                "TreatmentDecisionRecord indisponível para registrar uma decisão."
            );
        }


        return result;
    }


    // ======================================
    // EXECUTAR VALIDATOR
    // ======================================

    runValidator(
        plan
    ) {

        const stage =
            this.createStage(
                "validator"
            );


        const validator =
            this.resolveValidator();


        if (
            !validator
        ) {

            this.addError(
                stage,
                "Validator indisponível."
            );


            return {

                stage,

                result:
                    null
            };
        }


        stage.available =
            true;


        if (
            typeof validator.validate !==
            "function"
        ) {

            this.addError(
                stage,
                "Validator não possui método validate()."
            );


            return {

                stage,

                result:
                    null
            };
        }


        try {

            const result =
                validator.validate(
                    plan
                );


            stage.executed =
                true;


            stage.valid =
                !!(
                    result &&
                    result.valid ===
                        true
                );


            if (
                result &&
                this.isArray(
                    result.errors
                )
            ) {

                result.errors.forEach(
                    error => {

                        this.addError(
                            stage,
                            error
                        );
                    }
                );
            }


            if (
                result &&
                this.isArray(
                    result.warnings
                )
            ) {

                result.warnings.forEach(
                    warning => {

                        this.addWarning(
                            stage,
                            warning
                        );
                    }
                );
            }


            if (
                !result
            ) {

                this.addError(
                    stage,
                    "Validator retornou resultado vazio."
                );
            }


            return {

                stage,

                result
            };

        } catch (
            error
        ) {

            this.addError(
                stage,
                error &&
                error.message
                    ? error.message
                    : "Erro desconhecido no Validator."
            );


            return {

                stage,

                result:
                    null
            };
        }
    }


    // ======================================
    // EXECUTAR DECISION GATE
    // ======================================

    runDecisionGate(
        plan,
        validation
    ) {

        const stage =
            this.createStage(
                "decision-gate"
            );


        const gate =
            this.resolveDecisionGate();


        if (
            !gate
        ) {

            this.addError(
                stage,
                "Decision Gate indisponível."
            );


            return {

                stage,

                result:
                    null
            };
        }


        stage.available =
            true;


        if (
            typeof gate.evaluate !==
            "function"
        ) {

            this.addError(
                stage,
                "Decision Gate não possui método evaluate()."
            );


            return {

                stage,

                result:
                    null
            };
        }


        try {

            const result =
                gate.evaluate(
                    plan,
                    validation
                );


            stage.executed =
                true;


            stage.valid =
                !!(
                    result &&
                    result.valid ===
                        true
                );


            if (
                result &&
                result.summary
            ) {

                if (
                    result.summary.errors >
                    0
                ) {

                    this.addError(
                        stage,
                        "Decision Gate encontrou erros."
                    );
                }


                if (
                    result.summary.warnings >
                    0
                ) {

                    this.addWarning(
                        stage,
                        "Decision Gate encontrou warnings."
                    );
                }
            }


            if (
                !result
            ) {

                this.addError(
                    stage,
                    "Decision Gate retornou resultado vazio."
                );
            }


            return {

                stage,

                result
            };

        } catch (
            error
        ) {

            this.addError(
                stage,
                error &&
                error.message
                    ? error.message
                    : "Erro desconhecido no Decision Gate."
            );


            return {

                stage,

                result:
                    null
            };
        }
    }


    // ======================================
    // EXECUTAR DECISION RECORD
    // ======================================

    runDecisionRecord(
        plan,
        gateResult
    ) {

        const stage =
            this.createStage(
                "decision-record"
            );


        const record =
            this.resolveDecisionRecord();


        if (
            !record
        ) {

            this.addError(
                stage,
                "Decision Record indisponível."
            );


            return {

                stage,

                result:
                    null
            };
        }


        stage.available =
            true;


        if (
            typeof record.createMany !==
            "function"
        ) {

            this.addError(
                stage,
                "Decision Record não possui método createMany()."
            );


            return {

                stage,

                result:
                    null
            };
        }


        try {

            const result =
                record.createMany(
                    plan,
                    gateResult
                );


            stage.executed =
                true;


            stage.valid =
                !!(
                    result &&
                    result.valid ===
                        true
                );


            if (
                result &&
                this.isArray(
                    result.errors
                )
            ) {

                result.errors.forEach(
                    error => {

                        this.addError(
                            stage,
                            error
                        );
                    }
                );
            }


            if (
                !result
            ) {

                this.addError(
                    stage,
                    "Decision Record retornou resultado vazio."
                );
            }


            return {

                stage,

                result
            };

        } catch (
            error
        ) {

            this.addError(
                stage,
                error &&
                error.message
                    ? error.message
                    : "Erro desconhecido no Decision Record."
            );


            return {

                stage,

                result:
                    null
            };
        }
    }


    // ======================================
    // VALIDAR LIMITES BOUNDED
    // ======================================

    validateBoundedAuthority(
        authority
    ) {

        const errors = [];


        if (
            !this.isObject(
                authority
            )
        ) {

            errors.push(
                "Autoridade bounded ausente."
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
                "Nível de autoridade bounded inválido."
            );
        }


        if (
            authority.processingPermission !==
            "none"
        ) {

            errors.push(
                "Autoridade bounded não pode liberar processingPermission nesta etapa."
            );
        }


        if (
            authority.audioProcessing !==
            false
        ) {

            errors.push(
                "Autoridade bounded não pode liberar processamento de áudio nesta etapa."
            );
        }


        if (
            authority.reconstructionPermission !==
            "none"
        ) {

            errors.push(
                "Autoridade bounded não pode liberar reconstrução nesta etapa."
            );
        }


        if (
            authority.executorPermission !==
            "none"
        ) {

            errors.push(
                "Autoridade bounded não pode liberar executor nesta etapa."
            );
        }


        const limits =
            authority.limits;


        if (
            !this.isObject(
                limits
            )
        ) {

            errors.push(
                "Limites bounded ausentes."
            );

        } else {

            if (
                !this.isFiniteNumber(
                    limits.maxGainDb
                ) ||
                limits.maxGainDb <
                0 ||
                limits.maxGainDb >
                2
            ) {

                errors.push(
                    "maxGainDb fora do limite seguro."
                );
            }


            if (
                !this.isFiniteNumber(
                    limits.maxCutDb
                ) ||
                limits.maxCutDb >
                0 ||
                limits.maxCutDb <
                -2
            ) {

                errors.push(
                    "maxCutDb fora do limite seguro."
                );
            }


            if (
                !Number.isInteger(
                    limits.maxInterventions
                ) ||
                limits.maxInterventions <
                0 ||
                limits.maxInterventions >
                1
            ) {

                errors.push(
                    "maxInterventions fora do limite seguro."
                );
            }


            if (
                limits.regionalOnly !==
                true
            ) {

                errors.push(
                    "Autoridade bounded deve permanecer regional."
                );
            }


            if (
                limits.globalProcessing !==
                false
            ) {

                errors.push(
                    "Processamento global não é permitido."
                );
            }


            if (
                limits.reconstruction !==
                false
            ) {

                errors.push(
                    "Reconstrução não é permitida."
                );
            }


            if (
                limits.saturation !==
                false
            ) {

                errors.push(
                    "Saturação não é permitida nesta etapa."
                );
            }


            if (
                limits.dynamicsExpansion !==
                false
            ) {

                errors.push(
                    "Expansão dinâmica não é permitida."
                );
            }


            if (
                limits.uncontrolledDeEssing !==
                false
            ) {

                errors.push(
                    "De-essing não controlado não é permitido."
                );
            }
        }


        if (
            authority.fallback !==
            "preserve"
        ) {

            errors.push(
                "Fallback bounded deve ser preserve."
            );
        }


        return {

            valid:
                errors.length ===
                0,

            errors
        };
    }


    // ======================================
    // CRIAR AUTORIDADE FINAL
    // ======================================

    buildAuthority(
        gateResult
    ) {

        const authority =
            this.cloneAuthority(
                this.authorityProfile
            );


        if (
            gateResult &&
            gateResult.decisionPermission ===
                "allowed"
        ) {

            authority.decisionPermission =
                "allowed";

        } else {

            authority.decisionPermission =
                "none";
        }


        // HARD LOCK

        authority.processingPermission =
            "none";


        authority.audioProcessing =
            false;


        authority.reconstructionPermission =
            "none";


        authority.executorPermission =
            "none";


        return authority;
    }


    // ======================================
    // VERIFICAR HARD LOCK
    // ======================================

    validateAuthority(
        validation,
        gateResult,
        recordResult
    ) {

        const errors = [];


        const authority =
            this.buildAuthority(
                gateResult
            );


        const boundedValidation =
            this.validateBoundedAuthority(
                authority
            );


        if (
            !boundedValidation.valid
        ) {

            errors.push(
                ...boundedValidation.errors
            );
        }


        if (
            validation &&
            validation.processingPermission !==
                "none"
        ) {

            errors.push(
                "Validator liberou processamento."
            );
        }


        if (
            gateResult &&
            gateResult.processingPermission !==
                "none"
        ) {

            errors.push(
                "Decision Gate liberou processamento."
            );
        }


        if (
            gateResult &&
            gateResult.audioProcessing !==
                false
        ) {

            errors.push(
                "Decision Gate indica processamento de áudio."
            );
        }


        if (
            recordResult &&
            this.isArray(
                recordResult.records
            )
        ) {

            recordResult.records
                .forEach(
                    record => {

                        if (
                            !record ||
                            !record.authority
                        ) {

                            errors.push(
                                "Decision Record sem autoridade válida."
                            );

                            return;
                        }


                        if (
                            record.authority
                                .processingPermission !==
                                "none"
                        ) {

                            errors.push(
                                "Decision Record liberou processamento."
                            );
                        }


                        if (
                            record.authority
                                .audioProcessing !==
                                false
                        ) {

                            errors.push(
                                "Decision Record indica processamento de áudio."
                            );
                        }


                        if (
                            record.authority
                                .executorPermission !==
                                "none"
                        ) {

                            errors.push(
                                "Decision Record liberou executor."
                            );
                        }
                    }
                );
        }


        return {

            valid:
                errors.length ===
                0,

            errors,

            authority:
                authority
        };
    }


    // ======================================
    // RESUMIR REGISTROS
    // ======================================

    summarizeRecords(
        result
    ) {

        const records =
            result &&
            this.isArray(
                result.records
            )
                ? result.records
                : [];


        let preserved =
            0;


        let decisions =
            0;


        for (
            let i = 0;
            i < records.length;
            i++
        ) {

            const action =
                records[i] &&
                records[i].decision &&
                records[i].decision.action;


            if (
                action ===
                "preserve"
            ) {

                preserved++;
            }


            if (
                action ===
                "decision"
            ) {

                decisions++;
            }
        }


        return {

            total:
                records.length,

            preserved,

            decisions
        };
    }


    // ======================================
    // EXECUTAR PIPELINE COMPLETO
    // ======================================

    evaluate(
        plan
    ) {

        const result = {

            version:
                this.version,

            valid:
                false,

            stage:
                "initialization",

            processingPermission:
                "none",

            audioProcessing:
                false,

            reconstructionPermission:
                "none",

            dependencies:
                null,

            validator:
                null,

            decisionGate:
                null,

            decisionRecord:
                null,

            authority:
                null,

            regionalInterventionIntent:
                [],

            summary:
                null,

            errors:
                [],

            warnings:
                []
        };


        // ==================================
        // VALIDAR PLANO
        // ==================================

        if (
            !this.isObject(
                plan
            )
        ) {

            result.errors.push(
                "Treatment Plan inválido ou ausente."
            );


            result.stage =
                "plan";


            return result;
        }


        // ==================================
        // AUTORIDADE BASE
        // ==================================

        result.authority =
            this.cloneAuthority(
                this.authorityProfile
            );


        // ==================================
        // DEPENDÊNCIAS INICIAIS
        // ==================================

        const dependencies =
            this.validateDependencies(
                false
            );


        result.dependencies =
            dependencies;


        if (
            !dependencies.valid
        ) {

            result.errors.push(
                ...dependencies.errors
            );


            result.stage =
                "dependencies";


            return result;
        }


        // ==================================
        // VALIDATOR
        // ==================================

        const validationResult =
            this.runValidator(
                plan
            );


        result.validator =
            validationResult;


        if (
            !validationResult.stage.valid
        ) {

            result.errors.push(
                ...validationResult.stage.errors
            );


            result.warnings.push(
                ...validationResult.stage.warnings
            );


            result.stage =
                "validator";


            return result;
        }


        // ==================================
        // DECISION GATE
        // ==================================

        const gateResult =
            this.runDecisionGate(
                plan,
                validationResult.result
            );


        result.decisionGate =
            gateResult;


        if (
            !gateResult.stage.valid
        ) {

            result.errors.push(
                ...gateResult.stage.errors
            );


            result.warnings.push(
                ...gateResult.stage.warnings
            );


            result.stage =
                "decision-gate";


            return result;
        }


        const gateDecision =
            gateResult.result;


        // ==================================
        // PRESERVAÇÃO / OBSERVAÇÃO
        // ==================================

        if (
            gateDecision &&
            gateDecision.decisionPermission !==
                "allowed"
        ) {

            const authority =
                this.validateAuthority(
                    validationResult.result,
                    gateDecision,
                    null
                );


            result.authority =
                authority.authority;


            if (
                !authority.valid
            ) {

                result.errors.push(
                    ...authority.errors
                );


                result.stage =
                    "authority";


                return result;
            }


            result.regionalInterventionIntent = [

                this.createRegionalInterventionIntent({

                    state:
                        "preserve",

                    decisionAuthority:
                        authority.authority,

                    rationale:
                        gateDecision.recommendation ||
                        "Nenhuma intervenção autorizada; preservar."
                })
            ];


            result.summary = {

                records: {

                    total:
                        0,

                    preserved:
                        1,

                    decisions:
                        0
                },

                decisionPermission:
                    "none",

                recommendation:
                    gateDecision.recommendation ||
                    "preserve",

                regionalIntentCount:
                    1
            };


            result.valid =
                true;


            result.stage =
                "complete";


            result.processingPermission =
                "none";


            result.audioProcessing =
                false;


            result.reconstructionPermission =
                "none";


            return result;
        }


        // ==================================
        // DECISION RECORD NECESSÁRIO
        // ==================================

        const recordDependencies =
            this.validateDependencies(
                true
            );


        result.dependencies =
            recordDependencies;


        if (
            !recordDependencies.valid
        ) {

            result.errors.push(
                ...recordDependencies.errors
            );


            result.stage =
                "decision-record-dependencies";


            return result;
        }


        // ==================================
        // DECISION RECORD
        // ==================================

        const recordResult =
            this.runDecisionRecord(
                plan,
                gateDecision
            );


        result.decisionRecord =
            recordResult;


        if (
            !recordResult.stage.valid
        ) {

            result.errors.push(
                ...recordResult.stage.errors
            );


            result.warnings.push(
                ...recordResult.stage.warnings
            );


            result.stage =
                "decision-record";


            return result;
        }


        // ==================================
        // AUTORIDADE
        // ==================================

        const authority =
            this.validateAuthority(
                validationResult.result,
                gateDecision,
                recordResult.result
            );


        result.authority =
            authority.authority;


        if (
            !authority.valid
        ) {

            result.errors.push(
                ...authority.errors
            );


            result.stage =
                "authority";


            return result;
        }


        // ==================================
        // INTENÇÕES REGIONAIS
        // ==================================

        const regionalIntents =
            this.buildRegionalInterventionIntents(
                recordResult.result,
                authority.authority
            );


        const intentValidation =
            this.validateRegionalInterventionIntents(
                regionalIntents,
                authority.authority
            );


        if (
            !intentValidation.valid
        ) {

            result.errors.push(
                ...intentValidation.errors
            );


            result.stage =
                "regional-intervention-intent";


            return result;
        }


        result.regionalInterventionIntent =
            regionalIntents;


        // ==================================
        // RESUMO
        // ==================================

        result.summary = {

            records:
                this.summarizeRecords(
                    recordResult.result
                ),

            decisionPermission:
                gateDecision
                    .decisionPermission,

            recommendation:
                gateDecision
                    .recommendation,

            authorityLevel:
                authority.authority
                    .level,

            regionalIntentCount:
                regionalIntents.length
        };


        // ==================================
        // FINAL
        // ==================================

        result.valid =
            true;


        result.stage =
            "complete";


        // ==================================
        // HARD LOCK FINAL
        // ==================================

        result.processingPermission =
            "none";


        result.audioProcessing =
            false;


        result.reconstructionPermission =
            "none";


        result.authority.processingPermission =
            "none";


        result.authority.audioProcessing =
            false;


        result.authority.reconstructionPermission =
            "none";


        result.authority.executorPermission =
            "none";


        // ==================================
        // HARD LOCK DAS INTENÇÕES
        // ==================================

        result.regionalInterventionIntent =
            result.regionalInterventionIntent
                .map(
                    intent => ({

                        ...intent,

                        decisionAuthority:
                            {
                                ...intent.decisionAuthority,
                                processingPermission:
                                    "none",
                                audioProcessing:
                                    false,
                                reconstructionPermission:
                                    "none",
                                executorPermission:
                                    "none"
                            },

                        executionPermission:
                            "none",

                        processingPermission:
                            "none",

                        audioProcessing:
                            false,

                        fallback:
                            "preserve"
                    })
                );


        return result;
    }


    // ======================================
    // ATALHO DE SEGURANÇA
    // ======================================

    canProcessAudio() {

        return false;
    }


    canExecuteTreatment() {

        return false;
    }


    canReconstruct() {

        return false;
    }
}


// ==========================================
// DISPONIBILIZAÇÃO GLOBAL
// ==========================================

window.TreatmentDecisionPipeline =
    TreatmentDecisionPipeline;