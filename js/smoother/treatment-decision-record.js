// ==========================================
// SMOOTHVSTUDIO
// TREATMENT DECISION RECORD
// V0.2
// ==========================================
//
// Responsabilidade:
//
// Registrar uma decisão de tratamento que já
// passou pelo TreatmentDecisionGate.
//
// Este módulo NÃO executa tratamento.
//
// Fluxo:
//
// Measurement
//      ↓
// Diagnostic Observer
//      ↓
// Treatment Bridge
//      ↓
// Treatment Plan
//      ↓
// Treatment Plan Validator
//      ↓
// Treatment Decision Gate
//      ↓
// Treatment Decision Record
//      ↓
// FUTURO Treatment Executor
//
// ==========================================
//
// IMPORTANTE:
//
// Este módulo NÃO:
//
// - processa áudio
// - altera AudioBuffer
// - cria filtros
// - aplica EQ
// - calcula ganho DSP
// - aplica compressão
// - aplica saturação
// - aplica de-esser
// - reconstrói espectro
// - libera processamento
//
// Uma decisão registrada NÃO significa
// autorização DSP.
//
// ==========================================


class TreatmentDecisionRecord {


    constructor(
        options = {}
    ) {

        this.version =
            "0.2";


        this.maxRecords =
            options.maxRecords ??
            64;


        // ==================================
        // AUTORIDADE HARD-LOCK
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
    // NÚMERO SEGURO
    // ======================================

    safeNumber(
        value,
        fallback = 0
    ) {

        const number =
            Number(value);


        return Number.isFinite(
            number
        )
            ? number
            : fallback;
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
    // TEXTO SEGURO
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
    // OBJETO SEGURO
    // ======================================

    isObject(
        value
    ) {

        return !!(
            value &&
            typeof value ===
                "object" &&
            !Array.isArray(
                value
            )
        );
    }


    // ======================================
    // ARRAY SEGURO
    // ======================================

    isArray(
        value
    ) {

        return Array.isArray(
            value
        );
    }


    // ======================================
    // COPIAR VALOR SIMPLES
    // ======================================

    cloneValue(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return value;
        }


        if (
            typeof structuredClone ===
            "function"
        ) {

            try {

                return structuredClone(
                    value
                );

            } catch (
                error
            ) {

                // fallback abaixo
            }
        }


        try {

            return JSON.parse(
                JSON.stringify(
                    value
                )
            );

        } catch (
            error
        ) {

            return null;
        }
    }


    // ======================================
    // IDENTIFICADOR
    // ======================================

    createId(
        region
    ) {

        const safeRegion =
            this.safeString(
                region,
                "global"
            )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                "-"
            );


        const time =
            Date.now()
            .toString(
                36
            );


        const random =
            Math.random()
            .toString(
                36
            )
            .slice(
                2,
                8
            );


        return (
            "decision-" +
            safeRegion +
            "-" +
            time +
            "-" +
            random
        );
    }


    // ======================================
    // TIMESTAMP
    // ======================================

    createTimestamp() {

        return new Date()
            .toISOString();
    }


    // ======================================
    // EXTRAIR REGIÃO
    // ======================================

    normalizeRegion(
        region
    ) {

        return this.safeString(
            region,
            "global"
        );
    }


    // ======================================
    // EXTRAIR ESTADO
    // ======================================

    normalizeEvidenceState(
        value
    ) {

        const state =
            this.safeString(
                value,
                "uncertain"
            );


        const allowed = [

            "natural",
            "elevated",
            "recessed",
            "unstable",
            "masked",
            "uncertain",
            "supported"

        ];


        return allowed.includes(
            state
        )
            ? state
            : "uncertain";
    }


    // ======================================
    // NORMALIZAR AÇÃO
    // ======================================

    normalizeAction(
        value
    ) {

        const action =
            this.safeString(
                value,
                "preserve"
            );


        const allowed = [

            "preserve",
            "observe",
            "decision"

        ];


        return allowed.includes(
            action
        )
            ? action
            : "observe";
    }


    // ======================================
    // CONFIANÇA
    // ======================================

    normalizeConfidence(
        value
    ) {

        return this.clamp(
            this.safeNumber(
                value
            ),
            0,
            1
        );
    }


    // ======================================
    // EXTRAIR EVIDÊNCIAS
    // ======================================

    normalizeEvidence(
        decision
    ) {

        const evidence =
            this.isObject(
                decision &&
                decision.evidence
            )
                ? decision.evidence
                : {};


        return {

            state:
                this.normalizeEvidenceState(
                    decision &&
                    (
                        decision.evidenceState ||
                        decision.regionalState ||
                        evidence.state
                    )
                ),

            confidence:
                this.normalizeConfidence(
                    decision &&
                    (
                        decision.confidence ||
                        evidence.confidence
                    )
                ),

            regionalConfidence:
                this.normalizeConfidence(
                    decision &&
                    (
                        decision.regionalConfidence ||
                        evidence.regionalConfidence
                    )
                ),

            source:
                this.safeString(
                    evidence.source,
                    "diagnostic"
                ),

            measured:
                evidence.measured ===
                    true,

            inferred:
                evidence.inferred ===
                    true,

            hypothesis:
                evidence.hypothesis ===
                    true
        };
    }


    // ======================================
    // EXTRAIR MOTIVOS
    // ======================================

    normalizeReasons(
        decision
    ) {

        const reasons =
            decision &&
            decision.reasons;


        if (
            this.isArray(
                reasons
            )
        ) {

            return reasons
                .filter(
                    item =>
                        typeof item ===
                        "string"
                )
                .map(
                    item =>
                        item.trim()
                )
                .filter(
                    item =>
                        item.length > 0
                )
                .slice(
                    0,
                    16
                );
        }


        if (
            typeof reasons ===
            "string" &&
            reasons.trim()
        ) {

            return [
                reasons.trim()
            ];
        }


        return [];
    }


    // ======================================
    // EXTRAIR REGRAS
    // ======================================

    normalizeRules(
        decision
    ) {

        if (
            !this.isArray(
                decision &&
                decision.rules
            )
        ) {

            return [];
        }


        return decision.rules
            .filter(
                rule =>
                    this.isObject(
                        rule
                    )
            )
            .map(
                rule => ({

                    id:
                        this.safeString(
                            rule.id,
                            "unknown-rule"
                        ),

                    passed:
                        rule.passed ===
                        true,

                    severity:
                        this.safeString(
                            rule.severity,
                            "info"
                        ),

                    message:
                        this.safeString(
                            rule.message,
                            ""
                        )
                })
            )
            .slice(
                0,
                32
            );
    }


    // ======================================
    // EXTRAIR GATE
    // ======================================

    normalizeGateResult(
        gateResult
    ) {

        if (
            !this.isObject(
                gateResult
            )
        ) {

            return {

                available:
                    false,

                valid:
                    false,

                decisionPermission:
                    "none",

                regionDecision:
                    "none",

                processingPermission:
                    "none",

                audioProcessing:
                    false
            };
        }


        return {

            available:
                true,

            valid:
                gateResult.valid ===
                    true,

            decisionPermission:
                gateResult
                    .decisionPermission ===
                    "allowed"
                    ? "allowed"
                    : "none",

            regionDecision:
                gateResult
                    .decisionPermission ===
                    "allowed"
                    ? "allowed"
                    : "none",

            processingPermission:
                "none",

            audioProcessing:
                false,

            recommendation:
                this.safeString(
                    gateResult.recommendation,
                    "observe"
                ),

            reason:
                this.safeString(
                    gateResult.reason,
                    ""
                )
        };
    }


    // ======================================
    // VERIFICAR SE DECISÃO PODE SER
    // REGISTRADA
    // ======================================

    canRecord(
        gateResult
    ) {

        const gate =
            this.normalizeGateResult(
                gateResult
            );


        if (
            !gate.available
        ) {

            return false;
        }


        if (
            !gate.valid
        ) {

            return false;
        }


        if (
            gate.decisionPermission !==
            "allowed"
        ) {

            return false;
        }


        if (
            gate.regionDecision !==
            "allowed"
        ) {

            return false;
        }


        if (
            gate.processingPermission !==
            "none"
        ) {

            return false;
        }


        if (
            gate.audioProcessing !==
            false
        ) {

            return false;
        }


        return true;
    }


    // ======================================
    // CRIAR REGISTRO
    // ======================================

    create(
        region,
        decision,
        gateResult
    ) {

        const safeRegion =
            this.normalizeRegion(
                region
            );


        const gate =
            this.normalizeGateResult(
                gateResult
            );


        // ==================================
        // GATE NÃO AUTORIZA
        // ==================================

        if (
            !this.canRecord(
                gate
            )
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                reason:
                    "decision-not-authorized"
            };
        }


        const evidence =
            this.normalizeEvidence(
                decision
            );


        const action =
            this.normalizeAction(
                decision &&
                (
                    decision.recommendedAction ||
                    decision.state ||
                    decision.action
                )
            );


        const reasons =
            this.normalizeReasons(
                decision
            );


        const rules =
            this.normalizeRules(
                decision
            );


        // ==================================
        // DECISÃO FINAL
        // ==================================

        const record = {

            id:
                this.createId(
                    safeRegion
                ),

            version:
                this.version,

            createdAt:
                this.createTimestamp(),

            region:
                safeRegion,

            evidence: {

                state:
                    evidence.state,

                confidence:
                    evidence.confidence,

                regionalConfidence:
                    evidence.regionalConfidence,

                source:
                    evidence.source,

                measured:
                    evidence.measured,

                inferred:
                    evidence.inferred,

                hypothesis:
                    evidence.hypothesis
            },

            decision: {

                action,

                reasons,

                rules
            },

            gate: {

                valid:
                    gate.valid,

                decisionPermission:
                    gate.decisionPermission,

                regionDecision:
                    gate.regionDecision,

                recommendation:
                    gate.recommendation,

                reason:
                    gate.reason
            },

            // ==================================
            // ORIGEM DA DECISÃO
            // ==================================
            //
            // Estrutura explícita consumida pelo
            // TreatmentExecutionValidator.
            //
            // Isto registra a origem da decisão,
            // mas continua sem liberar DSP.
            //

            decisionAuthority: {

                decisionPermission:
                    gate.decisionPermission,

                regionDecision:
                    gate.regionDecision,

                processingPermission:
                    "none",

                audioProcessing:
                    false
            },

            // ==================================
            // AUTORIDADE HARD-LOCK
            // ==================================

            authority: {

                decisionPermission:
                    "allowed",

                processingPermission:
                    "none",

                reconstructionPermission:
                    "none",

                executorPermission:
                    "none",

                audioProcessing:
                    false
            }
        };


        // ==================================
        // HARD SAFETY CHECK
        // ==================================

        if (
            record.decisionAuthority
                .decisionPermission !==
                "allowed"
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                reason:
                    "decision-authority-invalid"
            };
        }


        if (
            record.decisionAuthority
                .regionDecision !==
                "allowed"
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                reason:
                    "regional-decision-authority-invalid"
            };
        }


        if (
            record.decisionAuthority
                .processingPermission !==
                "none"
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                reason:
                    "processing-authority-violation"
            };
        }


        if (
            record.decisionAuthority
                .audioProcessing !==
                false
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                reason:
                    "audio-processing-violation"
            };
        }


        if (
            record.authority
                .processingPermission !==
                "none"
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                reason:
                    "processing-authority-violation"
            };
        }


        if (
            record.authority
                .audioProcessing !==
                false
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                reason:
                    "audio-processing-violation"
            };
        }


        return {

            valid:
                true,

            record
        };
    }


    // ======================================
    // CRIAR VÁRIOS REGISTROS
    // ======================================

    createMany(
        plan,
        gateResult
    ) {

        const records = [];


        if (
            !this.isObject(
                plan
            ) ||
            !this.isObject(
                plan.regions
            )
        ) {

            return {

                valid:
                    false,

                records,

                reason:
                    "regions-unavailable"
            };
        }


        const regionNames =
            Object.keys(
                plan.regions
            );


        for (
            let i = 0;
            i < regionNames.length;
            i++
        ) {

            const region =
                regionNames[i];


            const decision =
                plan.regions[
                    region
                ];


            let gateDecision =
                null;


            if (
                this.isArray(
                    gateResult &&
                    gateResult.regionResults
                )
            ) {

                gateDecision =
                    gateResult
                        .regionResults
                        .find(
                            item =>
                                item &&
                                item.region ===
                                region
                        );
            }


            if (
                !gateDecision
            ) {

                continue;
            }


            const result =
                this.create(
                    region,
                    decision,
                    gateDecision
                );


            if (
                result.valid &&
                result.record
            ) {

                records.push(
                    result.record
                );
            }
        }


        return {

            valid:
                true,

            records:
                records.slice(
                    0,
                    this.maxRecords
                ),

            count:
                Math.min(
                    records.length,
                    this.maxRecords
                )
        };
    }


    // ======================================
    // VALIDAR REGISTRO
    // ======================================

    validate(
        record
    ) {

        const errors = [];


        if (
            !this.isObject(
                record
            )
        ) {

            errors.push(
                "record-invalid"
            );


            return {

                valid:
                    false,

                errors
            };
        }


        if (
            !this.safeString(
                record.id
            )
        ) {

            errors.push(
                "record-id-missing"
            );
        }


        if (
            !this.safeString(
                record.region
            )
        ) {

            errors.push(
                "record-region-missing"
            );
        }


        if (
            !this.isObject(
                record.evidence
            )
        ) {

            errors.push(
                "record-evidence-missing"
            );
        }


        if (
            !this.isObject(
                record.decision
            )
        ) {

            errors.push(
                "record-decision-missing"
            );
        }


        if (
            !this.isObject(
                record.authority
            )
        ) {

            errors.push(
                "record-authority-missing"
            );
        }


        if (
            !this.isObject(
                record.decisionAuthority
            )
        ) {

            errors.push(
                "record-decision-authority-missing"
            );
        }


        // ==================================
        // DECISION AUTHORITY
        // ==================================

        if (
            record.decisionAuthority
        ) {

            if (
                record.decisionAuthority
                    .decisionPermission !==
                "allowed"
            ) {

                errors.push(
                    "decision-permission-must-be-allowed"
                );
            }


            if (
                record.decisionAuthority
                    .regionDecision !==
                "allowed"
            ) {

                errors.push(
                    "regional-decision-must-be-allowed"
                );
            }


            if (
                record.decisionAuthority
                    .processingPermission !==
                "none"
            ) {

                errors.push(
                    "decision-processing-permission-must-remain-none"
                );
            }


            if (
                record.decisionAuthority
                    .audioProcessing !==
                false
            ) {

                errors.push(
                    "decision-audio-processing-must-remain-false"
                );
            }
        }


        // ==================================
        // HARD LOCKS
        // ==================================

        if (
            !record.authority ||
            record.authority
                .processingPermission !==
                "none"
        ) {

            errors.push(
                "processing-permission-must-remain-none"
            );
        }


        if (
            !record.authority ||
            record.authority
                .reconstructionPermission !==
                "none"
        ) {

            errors.push(
                "reconstruction-permission-must-remain-none"
            );
        }


        if (
            !record.authority ||
            record.authority
                .executorPermission !==
                "none"
        ) {

            errors.push(
                "executor-permission-must-remain-none"
            );
        }


        if (
            !record.authority ||
            record.authority
                .audioProcessing !==
                false
        ) {

            errors.push(
                "audio-processing-must-remain-false"
            );
        }


        // ==================================
        // CONFIANÇA
        // ==================================

        if (
            record.evidence
        ) {

            const confidence =
                this.normalizeConfidence(
                    record.evidence
                        .confidence
                );


            const regionalConfidence =
                this.normalizeConfidence(
                    record.evidence
                        .regionalConfidence
                );


            if (
                confidence <=
                0
            ) {

                errors.push(
                    "diagnostic-confidence-missing"
                );
            }


            if (
                regionalConfidence <=
                0
            ) {

                errors.push(
                    "regional-confidence-missing"
                );
            }
        }


        return {

            valid:
                errors.length ===
                0,

            errors
        };
    }


    // ======================================
    // CONGELAR REGISTRO
    // ======================================
    //
    // Depois de criado, o registro deve ser
    // tratado como evidência histórica da
    // decisão.
    //
    // ======================================

    freeze(
        record
    ) {

        const validation =
            this.validate(
                record
            );


        if (
            !validation.valid
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                errors:
                    validation.errors
            };
        }


        const copy =
            this.cloneValue(
                record
            );


        if (
            !copy
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                errors: [
                    "record-clone-failed"
                ]
            };
        }


        try {

            if (
                typeof Object.freeze ===
                "function"
            ) {

                Object.freeze(
                    copy.evidence
                );

                Object.freeze(
                    copy.decision
                );

                Object.freeze(
                    copy.gate
                );

                Object.freeze(
                    copy.decisionAuthority
                );

                Object.freeze(
                    copy.authority
                );

                Object.freeze(
                    copy
                );
            }

        } catch (
            error
        ) {

            return {

                valid:
                    false,

                record:
                    null,

                errors: [
                    "record-freeze-failed"
                ]
            };
        }


        return {

            valid:
                true,

            record:
                copy
        };
    }


    // ======================================
    // EXPORTAR SOMENTE INFORMAÇÃO
    // ======================================

    summarize(
        record
    ) {

        if (
            !this.isObject(
                record
            )
        ) {

            return {

                valid:
                    false
            };
        }


        return {

            valid:
                true,

            id:
                record.id,

            version:
                record.version,

            region:
                record.region,

            evidenceState:
                record.evidence &&
                record.evidence.state,

            confidence:
                record.evidence &&
                record.evidence.confidence,

            regionalConfidence:
                record.evidence &&
                record.evidence.regionalConfidence,

            action:
                record.decision &&
                record.decision.action,

            decisionPermission:
                record.decisionAuthority &&
                record.decisionAuthority
                    .decisionPermission,

            regionDecision:
                record.decisionAuthority &&
                record.decisionAuthority
                    .regionDecision,

            processingPermission:
                "none",

            audioProcessing:
                false
        };
    }


    // ======================================
    // VERIFICAÇÃO DE AUTORIDADE
    // ======================================

    canProcessAudio() {

        return false;
    }


    canGenerateFilters() {

        return false;
    }


    canGenerateGain() {

        return false;
    }


    canReconstruct() {

        return false;
    }


    canExecuteTreatment() {

        return false;
    }
}


// ==========================================
// DISPONIBILIZAÇÃO GLOBAL
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.TreatmentDecisionRecord =
        TreatmentDecisionRecord;
}