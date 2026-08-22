// ==========================================
// SMOOTHVSTUDIO
// TREATMENT CONTRACT AUDIT
// V0.3
// ==========================================
//
// Auditoria observacional dos contratos entre:
//
// Treatment Plan
//        ↓
// Treatment Plan Validator
//        ↓
// Treatment Decision Gate
//        ↓
// Treatment Decision Record
//        ↓
// Treatment Decision Pipeline
//
// E, opcionalmente:
//
// Treatment Plan
//        ↓
// DSP Snapshot
//        ↓
// Semantic Reconciliation
//
// ==========================================
//
// ESTE MÓDULO NÃO:
//
// - processa áudio;
// - altera AudioBuffer;
// - executa DSP;
// - cria filtros;
// - cria EQ;
// - altera ganho;
// - executa tratamento;
// - modifica outros módulos;
// - corrige automaticamente contratos;
// - autoriza processamento.
//
// Sua responsabilidade é OBSERVAR:
//
// - compatibilidade estrutural;
// - autoridade;
// - intenção de tratamento;
// - relação semântica entre plano e DSP;
// - correspondências diretas quando comprovadas.
//
// ==========================================
//
// PRINCÍPIO:
//
// evidência > suposição
//
// ==========================================


class TreatmentContractAudit {


    constructor(
        options = {}
    ) {


        this.version =
            "0.3";


        this.validator =
            options.validator ||
            null;


        this.decisionGate =
            options.decisionGate ||
            null;


        this.decisionRecord =
            options.decisionRecord ||
            null;


        this.pipeline =
            options.pipeline ||
            null;


        // ==================================
        // SNAPSHOT OPCIONAL DO TREATMENT PLAN
        // ==================================

        this.treatmentPlan =
            options.treatmentPlan ||
            null;


        // ==================================
        // SNAPSHOT OPCIONAL DO DSP
        // ==================================

        this.dspSnapshot =
            options.dspSnapshot ||
            null;


        // ==================================
        // HARD LOCK
        // ==================================

        this.processingPermission =
            "none";


        this.audioProcessing =
            false;


        this.reconstructionPermission =
            "none";


        this.executorPermission =
            "none";
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
    // FUNÇÃO
    // ======================================

    isFunction(
        value
    ) {

        return typeof value ===
            "function";
    }


    // ======================================
    // STRING
    // ======================================

    safeString(
        value,
        fallback = ""
    ) {

        return typeof value ===
            "string"
            ? value.trim()
            : fallback;
    }


    // ======================================
    // NÚMERO
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
    // RESOLVER GLOBAL
    // ======================================

    resolveGlobal(
        className
    ) {

        if (
            typeof window ===
            "undefined"
        ) {

            return null;
        }


        const Constructor =
            window[
                className
            ];


        if (
            !this.isFunction(
                Constructor
            )
        ) {

            return null;
        }


        try {

            return new Constructor();

        } catch (
            error
        ) {

            return null;
        }
    }


    // ======================================
    // RESOLVER DEPENDÊNCIAS
    // ======================================

    resolveDependencies() {

        const validator =
            this.validator ||
            this.resolveGlobal(
                "TreatmentPlanValidator"
            );


        const decisionGate =
            this.decisionGate ||
            this.resolveGlobal(
                "TreatmentDecisionGate"
            );


        const decisionRecord =
            this.decisionRecord ||
            this.resolveGlobal(
                "TreatmentDecisionRecord"
            );


        const pipeline =
            this.pipeline ||
            this.resolveGlobal(
                "TreatmentDecisionPipeline"
            );


        return {

            validator,

            decisionGate,

            decisionRecord,

            pipeline
        };
    }


    // ======================================
    // CRIAR RESULTADO
    // ======================================

    createResult(
        name
    ) {

        return {

            name,

            available:
                false,

            compatible:
                false,

            methods:
                {},

            errors:
                [],

            warnings:
                []
        };
    }


    // ======================================
    // VERIFICAR MÉTODOS
    // ======================================

    checkMethods(
        instance,
        expectedMethods,
        result
    ) {

        if (
            !this.isObject(
                instance
            )
        ) {

            result.errors.push(
                "instance-unavailable"
            );


            return false;
        }


        result.available =
            true;


        let compatible =
            true;


        for (
            let i = 0;
            i < expectedMethods.length;
            i++
        ) {

            const method =
                expectedMethods[i];


            const available =
                this.isFunction(
                    instance[
                        method
                    ]
                );


            result.methods[
                method
            ] =
                available;


            if (
                !available
            ) {

                compatible =
                    false;


                result.errors.push(
                    "missing-method:" +
                    method
                );
            }
        }


        result.compatible =
            compatible;


        return compatible;
    }


    // ======================================
    // AUDITAR VALIDATOR
    // ======================================

    auditValidator(
        validator
    ) {

        const result =
            this.createResult(
                "validator"
            );


        this.checkMethods(
            validator,

            [
                "validate"
            ],

            result
        );


        return result;
    }


    // ======================================
    // AUDITAR DECISION GATE
    // ======================================

    auditDecisionGate(
        decisionGate
    ) {

        const result =
            this.createResult(
                "decision-gate"
            );


        this.checkMethods(
            decisionGate,

            [
                "evaluate"
            ],

            result
        );


        return result;
    }


    // ======================================
    // AUDITAR DECISION RECORD
    // ======================================

    auditDecisionRecord(
        decisionRecord
    ) {

        const result =
            this.createResult(
                "decision-record"
            );


        this.checkMethods(
            decisionRecord,

            [
                "create",
                "createMany",
                "validate",
                "freeze"
            ],

            result
        );


        return result;
    }


    // ======================================
    // AUDITAR PIPELINE
    // ======================================

    auditPipeline(
        pipeline
    ) {

        const result =
            this.createResult(
                "decision-pipeline"
            );


        this.checkMethods(
            pipeline,

            [
                "evaluate"
            ],

            result
        );


        return result;
    }


    // ======================================
    // AUDITAR AUTORIDADE
    // ======================================

    auditAuthority(
        dependencies
    ) {

        const result = {

            compatible:
                true,

            errors:
                [],

            warnings:
                []
        };


        const instances = [

            {
                name:
                    "validator",

                instance:
                    dependencies.validator
            },

            {
                name:
                    "decisionGate",

                instance:
                    dependencies.decisionGate
            },

            {
                name:
                    "decisionRecord",

                instance:
                    dependencies.decisionRecord
            },

            {
                name:
                    "pipeline",

                instance:
                    dependencies.pipeline
            }
        ];


        for (
            let i = 0;
            i < instances.length;
            i++
        ) {

            const item =
                instances[i];


            if (
                !this.isObject(
                    item.instance
                )
            ) {

                continue;
            }


            const processingPermission =
                item.instance
                    .processingPermission;


            const audioProcessing =
                item.instance
                    .audioProcessing;


            const reconstructionPermission =
                item.instance
                    .reconstructionPermission;


            const executorPermission =
                item.instance
                    .executorPermission;


            if (
                processingPermission !==
                undefined &&
                processingPermission !==
                "none"
            ) {

                result.compatible =
                    false;


                result.errors.push(
                    item.name +
                    ":processing-permission-not-locked"
                );
            }


            if (
                audioProcessing !==
                undefined &&
                audioProcessing !==
                false
            ) {

                result.compatible =
                    false;


                result.errors.push(
                    item.name +
                    ":audio-processing-not-locked"
                );
            }


            if (
                reconstructionPermission !==
                undefined &&
                reconstructionPermission !==
                "none"
            ) {

                result.compatible =
                    false;


                result.errors.push(
                    item.name +
                    ":reconstruction-not-locked"
                );
            }


            if (
                executorPermission !==
                undefined &&
                executorPermission !==
                "none"
            ) {

                result.compatible =
                    false;


                result.errors.push(
                    item.name +
                    ":executor-not-locked"
                );
            }
        }


        return result;
    }


    // ======================================
    // VERIFICAR CONTRATO DE GATE
    // ======================================

    auditGateContract() {

        const result = {

            compatible:
                true,

            errors:
                [],

            warnings:
                []
        };


        const gate =
            this.resolveDependencies()
                .decisionGate;


        if (
            !this.isObject(
                gate
            )
        ) {

            result.compatible =
                false;


            result.errors.push(
                "decision-gate-unavailable"
            );


            return result;
        }


        if (
            !this.isFunction(
                gate.evaluate
            )
        ) {

            result.compatible =
                false;


            result.errors.push(
                "decision-gate-evaluate-missing"
            );
        }


        return result;
    }


    // ======================================
    // VERIFICAR CONTRATO DO RECORD
    // ======================================

    auditRecordContract() {

        const result = {

            compatible:
                true,

            errors:
                [],

            warnings:
                []
        };


        const record =
            this.resolveDependencies()
                .decisionRecord;


        if (
            !this.isObject(
                record
            )
        ) {

            result.compatible =
                false;


            result.errors.push(
                "decision-record-unavailable"
            );


            return result;
        }


        if (
            !this.isFunction(
                record.createMany
            )
        ) {

            result.compatible =
                false;


            result.errors.push(
                "decision-record-createMany-missing"
            );
        }


        return result;
    }


    // ======================================
    // AUDITAR PIPELINE
    // ======================================

    auditPipelineContract() {

        const result = {

            compatible:
                true,

            errors:
                [],

            warnings:
                []
        };


        const pipeline =
            this.resolveDependencies()
                .pipeline;


        if (
            !this.isObject(
                pipeline
            )
        ) {

            result.compatible =
                false;


            result.errors.push(
                "decision-pipeline-unavailable"
            );


            return result;
        }


        if (
            !this.isFunction(
                pipeline.evaluate
            )
        ) {

            result.compatible =
                false;


            result.errors.push(
                "decision-pipeline-evaluate-missing"
            );
        }


        return result;
    }


    // ======================================
    // NORMALIZAR REGIÕES
    // ======================================

    getTreatmentRegions(
        treatmentPlan
    ) {

        if (
            !this.isObject(
                treatmentPlan
            )
        ) {

            return {};
        }


        if (
            this.isObject(
                treatmentPlan.decisions
            )
        ) {

            return treatmentPlan.decisions;
        }


        if (
            this.isObject(
                treatmentPlan.regions
            )
        ) {

            return treatmentPlan.regions;
        }


        return {};
    }


    // ======================================
    // NORMALIZAR ESTADO
    // ======================================

    getDecisionState(
        decision
    ) {

        if (
            !this.isObject(
                decision
            )
        ) {

            return "";
        }


        return this.safeString(
            decision.state ||
            decision.status ||
            decision.action ||
            "",
            ""
        ).toLowerCase();
    }


    // ======================================
    // NORMALIZAR GANHO
    // ======================================

    getTargetDb(
        decision
    ) {

        if (
            !this.isObject(
                decision
            )
        ) {

            return null;
        }


        const candidates = [

            decision.targetDb,

            decision.gainDb,

            decision.reductionDb
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


        return null;
    }


    // ======================================
    // NORMALIZAR DSP REGION
    // ======================================

    getDspRegion(
        dspSnapshot,
        region
    ) {

        if (
            !this.isObject(
                dspSnapshot
            )
        ) {

            return null;
        }


        if (
            this.isObject(
                dspSnapshot[
                    region
                ]
            )
        ) {

            return dspSnapshot[
                region
            ];
        }


        if (
            this.isObject(
                dspSnapshot.regions
            ) &&
            this.isObject(
                dspSnapshot.regions[
                    region
                ]
            )
        ) {

            return dspSnapshot.regions[
                region
            ];
        }


        return null;
    }


    // ======================================
    // DEFINIR MAPEAMENTO SEMÂNTICO
    // ======================================
    //
    // IMPORTANTE:
    //
    // Este método NÃO afirma equivalência
    // numérica.
    //
    // Ele apenas registra relações que
    // possuem evidência arquitetural.
    //
    // ======================================

    getSemanticMapping(
        region
    ) {

        const mappings = {

            bass: {

                relation:
                    "SEMANTICALLY_RELATED",

                dspRegions: [

                    "body",

                    "tone"
                ],

                reason:
                    "Bass do plano se relaciona a tratamento de grave/corpo, mas os parâmetros DSP não representam diretamente targetDb de bass."
            },


            body: {

                relation:
                    "SEMANTICALLY_RELATED",

                dspRegions: [

                    "body",

                    "tone"
                ],

                reason:
                    "Body do plano se relaciona aos módulos Body/Tone, porém os parâmetros possuem modelos e bandas próprias."
            },


            mid: {

                relation:
                    "SEMANTICALLY_RELATED",

                dspRegions: [

                    "tone"
                ],

                reason:
                    "Mid do plano possui relação com o tratamento tonal, mas não há equivalência direta demonstrada entre targetDb e os ganhos internos do Tone."
            },


            presence: {

                relation:
                    "NO_MAPPING",

                dspRegions:
                    [],

                reason:
                    "Não existe atualmente um parâmetro DSP inequívoco no snapshot que represente diretamente presence."
            },


            harshness: {

                relation:
                    "SEMANTICALLY_RELATED",

                dspRegions: [

                    "dynamics"
                ],

                reason:
                    "Harshness influencia o cálculo de intensidade dinâmica, mas intensity, threshold e ratio não são equivalentes a targetDb de harshness."
            },


            sibilance: {

                relation:
                    "SEMANTICALLY_RELATED",

                dspRegions: [

                    "sibilance"
                ],

                reason:
                    "Treatment Plan e VocalSibilance utilizam evidência de sibilância e controlam tratamento relacionado, porém usam modelos matemáticos diferentes."
            },


            air: {

                relation:
                    "NO_MAPPING",

                dspRegions:
                    [],

                reason:
                    "Não existe atualmente correspondência DSP inequívoca para air no snapshot."
            }
        };


        return (
            mappings[
                region
            ] || {

                relation:
                    "NO_MAPPING",

                dspRegions:
                    [],

                reason:
                    "Nenhum mapeamento semântico registrado."
            }
        );
    }


    // ======================================
    // CLASSIFICAR RELAÇÃO SEMÂNTICA
    // ======================================

    classifySemanticRelation(
        region,
        decision,
        dspRegion
    ) {

        const mapping =
            this.getSemanticMapping(
                region
            );


        if (
            mapping.relation ===
            "NO_MAPPING"
        ) {

            return {

                classification:
                    "NO_MAPPING",

                reason:
                    mapping.reason,

                mapping
            };
        }


        if (
            !this.isObject(
                decision
            )
        ) {

            return {

                classification:
                    "UNSUPPORTED",

                reason:
                    "Decisão de tratamento não disponível.",

                mapping
            };
        }


        const state =
            this.getDecisionState(
                decision
            );


        const blockedStates = [

            "uncertain",

            "unstable",

            "masked",

            "blocked",

            "none",

            "skip"
        ];


        if (
            blockedStates.indexOf(
                state
            ) !==
            -1
        ) {

            return {

                classification:
                    "BLOCKED",

                reason:
                    "Estado da decisão não autoriza interpretação de tratamento.",

                mapping
            };
        }


        if (
            !this.isObject(
                dspRegion
            )
        ) {

            return {

                classification:
                    "SEMANTICALLY_RELATED",

                reason:
                    mapping.reason +
                    " Nenhum snapshot DSP correspondente foi fornecido para confirmar execução.",

                mapping
            };
        }


        const dspEnabled =
            dspRegion.enabled ===
            true;


        const dspActive =
            dspRegion.active ===
            true;


        const hasDspIntent =
            dspEnabled ||
            dspActive;


        if (
            hasDspIntent
        ) {

            return {

                classification:
                    "SEMANTICALLY_RELATED",

                reason:
                    mapping.reason +
                    " Existe intenção/configuração DSP observável, mas não há equivalência numérica direta comprovada.",

                mapping
            };
        }


        return {

            classification:
                "SEMANTICALLY_RELATED",

            reason:
                mapping.reason +
                " A relação semântica existe, porém não foi demonstrada uma intenção DSP ativa equivalente.",

            mapping
        };
    }


    // ======================================
    // AUDITAR UMA REGIÃO
    // ======================================

    auditReconciliationRegion(
        region,
        decision,
        dspRegion
    ) {

        const semantic =
            this.classifySemanticRelation(
                region,
                decision,
                dspRegion
            );


        const targetDb =
            this.getTargetDb(
                decision
            );


        const dspGainDb =
            this.isObject(
                dspRegion
            ) &&
            this.isFiniteNumber(
                dspRegion.gainDb
            )
            ? dspRegion.gainDb
            : null;


        return {

            region,

            classification:
                semantic.classification,

            semanticRelation:
                semantic.mapping.relation,

            semanticReason:
                semantic.reason,

            mappedDspRegions:
                semantic.mapping.dspRegions,

            decisionState:
                this.getDecisionState(
                    decision
                ),

            treatment:
                this.safeString(
                    decision &&
                    (
                        decision.treatment ||
                        decision.action ||
                        decision.type
                    ),
                    ""
                ),

            targetDb,

            dspGainDb,

            differenceDb:
                null,

            differenceStatus:
                "NOT_COMPARABLE",

            evidence:

                decision &&
                decision.evidence
                    ? decision.evidence
                    : null,

            processingPermission:
                "none",

            audioProcessing:
                false
        };
    }


    // ======================================
    // RECONCILIAR PLAN ↔ DSP
    // ======================================
    //
    // Esta função é puramente observacional.
    //
    // Não chama processadores.
    // Não altera parâmetros.
    // Não cria filtros.
    // Não recebe AudioBuffer.
    //
    // ======================================

    auditTreatmentDspReconciliation(
        treatmentPlan =
            this.treatmentPlan,

        dspSnapshot =
            this.dspSnapshot
    ) {

        const result = {

            available:
                false,

            classification:
                "NOT_EVALUATED",

            regions:
                {},

            summary: {

                directMapping:
                    0,

                semanticallyRelated:
                    0,

                noMapping:
                    0,

                blocked:
                    0,

                unsupported:
                    0
            },

            processingPermission:
                "none",

            audioProcessing:
                false,

            executorPermission:
                "none",

            errors:
                [],

            warnings:
                []
        };


        if (
            !this.isObject(
                treatmentPlan
            )
        ) {

            result.warnings.push(
                "treatment-plan-unavailable"
            );


            return result;
        }


        if (
            !this.isObject(
                dspSnapshot
            )
        ) {

            result.warnings.push(
                "dsp-snapshot-unavailable"
            );


            return result;
        }


        const decisions =
            this.getTreatmentRegions(
                treatmentPlan
            );


        if (
            !this.isObject(
                decisions
            )
        ) {

            result.warnings.push(
                "treatment-decisions-unavailable"
            );


            return result;
        }


        result.available =
            true;


        const regions = [

            "bass",

            "body",

            "mid",

            "presence",

            "harshness",

            "sibilance",

            "air"
        ];


        let hasNoMapping =
            false;


        let hasBlocked =
            false;


        let hasUnsupported =
            false;


        let hasSemantic =
            false;


        for (
            let i = 0;
            i < regions.length;
            i++
        ) {

            const region =
                regions[i];


            const decision =
                decisions[
                    region
                ] || null;


            const dspRegion =
                this.getDspRegion(
                    dspSnapshot,
                    region
                );


            const audit =
                this.auditReconciliationRegion(
                    region,
                    decision,
                    dspRegion
                );


            result.regions[
                region
            ] =
                audit;


            switch (
                audit.classification
            ) {

                case "DIRECT_MAPPING":

                    result.summary.directMapping++;

                    break;


                case "SEMANTICALLY_RELATED":

                    result.summary.semanticallyRelated++;

                    hasSemantic =
                        true;

                    break;


                case "NO_MAPPING":

                    result.summary.noMapping++;

                    hasNoMapping =
                        true;

                    break;


                case "BLOCKED":

                    result.summary.blocked++;

                    hasBlocked =
                        true;

                    break;


                case "UNSUPPORTED":

                    result.summary.unsupported++;

                    hasUnsupported =
                        true;

                    break;
            }
        }


        /*
         * A classificação geral não deve fingir
         * que uma relação semântica é alinhamento
         * direto.
         */

        if (
            hasUnsupported
        ) {

            result.classification =
                "UNSUPPORTED";

        } else if (
            hasBlocked
        ) {

            result.classification =
                "BLOCKED";

        } else if (
            hasNoMapping
        ) {

            result.classification =
                "PARTIALLY_MAPPED";

        } else if (
            hasSemantic
        ) {

            result.classification =
                "SEMANTICALLY_RELATED";

        } else {

            result.classification =
                "NOT_EVALUATED";
        }


        return result;
    }


    // ======================================
    // CLASSIFICAR RESULTADO ESTRUTURAL
    // ======================================

    classify(
        results
    ) {

        let errors =
            0;


        let warnings =
            0;


        const keys =
            Object.keys(
                results
            );


        for (
            let i = 0;
            i < keys.length;
            i++
        ) {

            const key =
                keys[i];


            const item =
                results[
                    key
                ];


            if (
                item &&
                Array.isArray(
                    item.errors
                )
            ) {

                errors +=
                    item.errors.length;
            }


            if (
                item &&
                Array.isArray(
                    item.warnings
                )
            ) {

                warnings +=
                    item.warnings.length;
            }
        }


        if (
            errors ===
            0 &&
            warnings ===
            0
        ) {

            return "COMPATIBLE";
        }


        if (
            errors ===
            0 &&
            warnings >
            0
        ) {

            return "PARTIALLY_COMPATIBLE";
        }


        return "INCOMPATIBLE";
    }


    // ======================================
    // EXECUTAR AUDITORIA
    // ======================================

    run() {

        const dependencies =
            this.resolveDependencies();


        const validator =
            this.auditValidator(
                dependencies.validator
            );


        const decisionGate =
            this.auditDecisionGate(
                dependencies.decisionGate
            );


        const decisionRecord =
            this.auditDecisionRecord(
                dependencies.decisionRecord
            );


        const pipeline =
            this.auditPipeline(
                dependencies.pipeline
            );


        const authority =
            this.auditAuthority(
                dependencies
            );


        const gateContract =
            this.auditGateContract();


        const recordContract =
            this.auditRecordContract();


        const pipelineContract =
            this.auditPipelineContract();


        const results = {

            validator,

            decisionGate,

            decisionRecord,

            pipeline,

            authority,

            gateContract,

            recordContract,

            pipelineContract
        };


        const classification =
            this.classify(
                results
            );


        return {

            version:
                this.version,

            classification,

            safeForDSP:
                false,

            processingPermission:
                "none",

            audioProcessing:
                false,

            reconstructionPermission:
                "none",

            executorPermission:
                "none",

            results,

            summary: {

                validator:
                    validator.compatible,

                decisionGate:
                    decisionGate.compatible,

                decisionRecord:
                    decisionRecord.compatible,

                pipeline:
                    pipeline.compatible,

                authority:
                    authority.compatible,

                gateContract:
                    gateContract.compatible,

                recordContract:
                    recordContract.compatible,

                pipelineContract:
                    pipelineContract.compatible
            }
        };
    }


    // ======================================
    // ALIASES
    // ======================================

    audit() {

        return this.run();
    }


    analyze() {

        return this.run();
    }


    // ======================================
    // HARD LOCK
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


    canGenerateDSP() {

        return false;
    }
}


// ==========================================
// DISPONIBILIZAÇÃO GLOBAL
// ==========================================

window.TreatmentContractAudit =
    TreatmentContractAudit;