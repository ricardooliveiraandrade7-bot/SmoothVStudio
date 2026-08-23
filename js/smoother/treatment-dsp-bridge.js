// ==========================================
// SMOOTHVSTUDIO
// TREATMENT DSP BRIDGE
// V0.2
// ==========================================
// Ponte observacional entre a decisão
// e o VocalBody.
//
// IMPORTANTE:
// Esta versão NÃO altera o áudio.
// Ela apenas registra o que a ponte recebe,
// permitindo verificar se a decisão realmente
// chega ao DSP.
//
// DECISION PIPELINE ≠ DSP PIPELINE
// ==========================================

(function() {

    "use strict";

    const PATCH_MARK =
        "__smoothVStudioTreatmentBridgePatched";

    const OBSERVER_MARK =
        "__smoothVStudioTreatmentObserverInstalled";

    const SNAPSHOT_KEY =
        "SmoothVStudioTreatmentDecisionObservation";

    function safeObject(value) {

        return !!(
            value &&
            typeof value === "object"
        );
    }

    function safeArray(value) {

        return Array.isArray(value);
    }

    function safeNumber(value) {

        return (
            typeof value === "number" &&
            Number.isFinite(value)
        );
    }

    function safeString(
        value,
        fallback = ""
    ) {

        if (
            typeof value !== "string"
        ) {
            return fallback;
        }

        return value.trim();
    }

    function cloneSafe(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return value;
        }

        try {

            return JSON.parse(
                JSON.stringify(value)
            );

        } catch (error) {

            return null;
        }
    }

    function normalizeConfidence(
        value
    ) {

        const text =
            safeString(
                value
            ).toLowerCase();

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

        return text || "unknown";
    }


    function summarizeIntent(
        intent,
        index
    ) {

        if (
            !safeObject(intent)
        ) {
            return {
                index,
                valid: false
            };
        }

        const region =
            safeObject(
                intent.region
            )
                ? intent.region
                : {};

        const requestedGain =
            intent.requestedGainDb;

        const boundedGain =
            intent.boundedGainDb;

        return {

            index,

            valid: true,

            state:
                safeString(
                    intent.state,
                    "unknown"
                ),

            confidence:
                normalizeConfidence(
                    intent.confidence
                ),

            region: {

                id:
                    safeString(
                        region.id ||
                        region.key ||
                        region.name,
                        "unknown"
                    ),

                name:
                    safeString(
                        region.name,
                        ""
                    )
            },

            treatmentType:
                safeString(
                    intent.treatmentType ||
                    intent.treatment ||
                    intent.actionType,
                    "unknown"
                ),

            requestedGainDb:
                safeNumber(
                    requestedGain
                )
                    ? requestedGain
                    : null,

            boundedGainDb:
                safeNumber(
                    boundedGain
                )
                    ? boundedGain
                    : null
        };
    }

    function summarizeDecision(
        decision
    ) {

        if (
            !safeObject(decision)
        ) {

            return {

                received: false,

                reason:
                    "decision-null-or-invalid",

                regionalIntentCount: 0,

                regionalInterventionIntent: []
            };
        }

        const intents =
            safeArray(
                decision.regionalInterventionIntent
            )
                ? decision.regionalInterventionIntent
                : [];

        return {

            received: true,

            version:
                safeString(
                    decision.version,
                    ""
                ),

            processingPermission:
                safeString(
                    decision.processingPermission,
                    "unknown"
                ),

            audioProcessing:
                decision.audioProcessing === true,

            reconstructionPermission:
                safeString(
                    decision.reconstructionPermission,
                    "unknown"
                ),

            authority:
                cloneSafe(
                    decision.authorityProfile ||
                    decision.authority ||
                    null
                ),

            regionalIntentCount:
                intents.length,

            regionalInterventionIntent:
                intents.map(
                    summarizeIntent
                )
        };
    }

    function findLowIntent(
        decision
    ) {

        if (
            !safeObject(decision) ||
            !safeArray(
                decision.regionalInterventionIntent
            )
        ) {
            return null;
        }

        for (
            let index = 0;
            index <
            decision.regionalInterventionIntent.length;
            index++
        ) {

            const intent =
                decision.regionalInterventionIntent[
                    index
                ];

            if (
                !safeObject(intent)
            ) {
                continue;
            }

            const region =
                safeObject(
                    intent.region
                )
                    ? intent.region
                    : {};

            const regionId =
                safeString(
                    region.id ||
                    region.key ||
                    region.name
                ).toLowerCase();

            if (
                regionId === "body" ||
                regionId === "bass" ||
                regionId === "grave" ||
                regionId === "low" ||
                regionId === "low-body" ||
                regionId === "lowbody"
            ) {

                return summarizeIntent(
                    intent,
                    index
                );
            }
        }

        return null;
    }


    function createObservation(
        decision,
        source
    ) {

        const summary =
            summarizeDecision(
                decision
            );

        const lowIntent =
            findLowIntent(
                decision
            );

        const observation = {

            timestamp:
                new Date().toISOString(),

            source:
                source || "unknown",

            decision:
                summary,

            lowIntent,

            bridgeStatus:
                summary.received
                    ? "decision-received"
                    : "decision-not-received",

            dspExecutionPermission:
                summary.received
                    ? summary.processingPermission
                    : "unknown",

            audioProcessing:
                summary.received
                    ? summary.audioProcessing
                    : false,

            interpretation: {

                lowIntentCandidate:
                    !!(
                        lowIntent &&
                        lowIntent.state ===
                        "candidate"
                    ),

                lowIntentConfidence:
                    lowIntent
                        ? lowIntent.confidence
                        : "unknown",

                lowIntentRequestedCut:
                    !!(
                        lowIntent &&
                        safeNumber(
                            lowIntent.requestedGainDb
                        ) &&
                        lowIntent.requestedGainDb < 0
                    ),

                lowIntentBoundedCut:
                    !!(
                        lowIntent &&
                        safeNumber(
                            lowIntent.boundedGainDb
                        ) &&
                        lowIntent.boundedGainDb < 0
                    )
            }
        };

        return observation;
    }

    function publishObservation(
        observation
    ) {

        if (
            typeof window !== "undefined"
        ) {

            window[
                SNAPSHOT_KEY
            ] = observation;
        }

        if (
            typeof console !== "undefined" &&
            typeof console.info === "function"
        ) {

            console.info(
                "[SmoothVStudio][Treatment DSP Bridge] Decision observation:",
                observation
            );
        }

        return observation;
    }

    function observeDecision(
        decision,
        source
    ) {

        const observation =
            createObservation(
                decision,
                source
            );

        return publishObservation(
            observation
        );
    }


    function patchVocalBody() {

        if (
            typeof window === "undefined" ||
            typeof window.VocalBody !==
                "function"
        ) {

            return false;
        }

        const prototype =
            window.VocalBody.prototype;

        if (
            !prototype ||
            typeof prototype.createProcessor !==
                "function"
        ) {

            return false;
        }

        if (
            prototype[
                PATCH_MARK
            ]
        ) {

            return true;
        }

        const originalCreateProcessor =
            prototype.createProcessor;

        prototype.createProcessor =
            function(
                context,
                analysis,
                treatmentDecision = null
            ) {

                observeDecision(
                    treatmentDecision,
                    "VocalBody.createProcessor"
                );

                return originalCreateProcessor.call(
                    this,
                    context,
                    analysis,
                    treatmentDecision
                );
            };

        prototype[
            PATCH_MARK
        ] = true;

        return true;
    }

    function patchVocalSmoother() {

        if (
            typeof window === "undefined" ||
            typeof window.VocalSmoother !==
                "function"
        ) {

            return false;
        }

        const prototype =
            window.VocalSmoother.prototype;

        if (
            !prototype ||
            typeof prototype.process !==
                "function"
        ) {

            return false;
        }

        if (
            prototype[
                OBSERVER_MARK
            ]
        ) {

            return true;
        }

        const originalProcess =
            prototype.process;

        prototype.process =
            async function(
                audioBuffer
            ) {

                const smoother =
                    this;

                const originalBody =
                    smoother.body;

                if (
                    smoother.body &&
                    typeof smoother.body.createProcessor ===
                        "function"
                ) {

                    const originalBodyCreateProcessor =
                        smoother.body.createProcessor;

                    smoother.body.createProcessor =
                        function(
                            context,
                            analysis,
                            treatmentDecision = null
                        ) {

                            const decision =
                                smoother
                                    .lastTreatmentDecisionPipeline ||
                                treatmentDecision ||
                                null;

                            observeDecision(
                                decision,
                                "VocalSmoother.process"
                            );

                            return originalBodyCreateProcessor.call(
                                this,
                                context,
                                analysis,
                                decision
                            );
                        };

                    try {

                        return await originalProcess.call(
                            smoother,
                            audioBuffer
                        );

                    } finally {

                        smoother.body =
                            originalBody;

                        if (
                            smoother.body &&
                            typeof smoother.body.createProcessor ===
                                "function"
                        ) {

                            smoother.body.createProcessor =
                                originalBodyCreateProcessor;
                        }
                    }
                }

                observeDecision(
                    smoother
                        .lastTreatmentDecisionPipeline ||
                    null,
                    "VocalSmoother.process-without-body"
                );

                return originalProcess.call(
                    smoother,
                    audioBuffer
                );
            };

        prototype[
            OBSERVER_MARK
        ] = true;

        return true;
    }


    function install() {

        const bodyReady =
            patchVocalBody();

        const smootherReady =
            patchVocalSmoother();

        if (
            bodyReady &&
            smootherReady
        ) {

            if (
                typeof console !== "undefined" &&
                typeof console.info === "function"
            ) {

                console.info(
                    "[SmoothVStudio][Treatment DSP Bridge] Observational bridge installed."
                );
            }

            return true;
        }

        if (
            typeof window !== "undefined"
        ) {

            window.setTimeout(
                install,
                0
            );
        }

        return false;
    }

    install();

    if (
        typeof window !== "undefined"
    ) {

        window.SmoothVStudioTreatmentDSPBridge = {

            version: "0.2",

            install,

            observeDecision,

            getLastObservation() {

                return (
                    window[
                        SNAPSHOT_KEY
                    ] || null
                );
            }
        };
    }

})();