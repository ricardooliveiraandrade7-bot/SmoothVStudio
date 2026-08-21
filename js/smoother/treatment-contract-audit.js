// ==========================================
// SMOOTHVSTUDIO
// TREATMENT CONTRACT AUDIT
// V0.1
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
// - corrige automaticamente contratos.
//
// Sua única responsabilidade é OBSERVAR
// compatibilidade estrutural.
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
            "0.1";


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
    // CLASSIFICAR RESULTADO
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