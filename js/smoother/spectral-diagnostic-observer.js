// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL DIAGNOSTIC OBSERVER
// V0.5
// ==========================================
//
// Camada de observação e interpretação
// contextual da inteligência espectral.
//
// RESPONSABILIDADE:
//
// - receber o contexto do
//   SpectralTreatmentBridge;
// - receber evidência do
//   SpectralRegionalMeasurement;
// - validar a estrutura;
// - criar snapshots seguros;
// - interpretar a qualidade da evidência;
// - distinguir evidência global de
//   evidência específica de região;
// - classificar estados acústicos regionais.
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
// REGRA FUNDAMENTAL:
//
// Estado acústico NÃO é ordem de processamento.
//
// A medição regional aumenta a qualidade
// da evidência disponível, mas não concede
// autoridade DSP.
//
// ==========================================


class SpectralDiagnosticObserver {


    constructor(
        options = {}
    ) {


        this.version =
            "0.5";


        // ==================================
        // CONFIGURAÇÃO CONSERVADORA
        // ==================================

        this.minimumConfidence =
            options.minimumConfidence ??
            0.55;


        this.minimumRegionalEvidence =
            options.minimumRegionalEvidence ??
            0.60;


        this.minimumStability =
            options.minimumStability ??
            0.45;


        this.minimumActivity =
            options.minimumActivity ??
            0.08;


        /*
         * Os limiares abaixo não representam
         * EQ ou intensidade de tratamento.
         *
         * São apenas limites diagnósticos
         * usados para decidir se uma evidência
         * é suficientemente forte para uma
         * classificação.
         */

        this.highRelativeEnergy =
            options.highRelativeEnergy ??
            1.20;


        this.lowRelativeEnergy =
            options.lowRelativeEnergy ??
            0.80;


        this.naturalRelativeMin =
            options.naturalRelativeMin ??
            0.90;


        this.naturalRelativeMax =
            options.naturalRelativeMax ??
            1.10;


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
    // VALIDAR ESTADO ACÚSTICO
    // ======================================

    isValidAcousticState(
        state
    ) {

        const validStates = [

            "natural",

            "elevated",

            "recessed",

            "unstable",

            "masked",

            "uncertain",

            "contextual",

            "supported"
        ];


        return validStates
            .indexOf(
                state
            ) !== -1;
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
                    "unknown",

                acousticState:
                    "uncertain",

                stateConfidence:
                    0,

                stateEvidence:
                    "none",

                temporalEvidence:
                    false,

                regionalMeasurement:
                    false,

                energy:
                    0,

                energyShare:
                    0,

                normalizedEnergy:
                    0,

                relativeEnergy:
                    0,

                stability:
                    0,

                activity:
                    0,

                bandCount:
                    0,

                lowHz:
                    0,

                highHz:
                    0,

                evidenceLevel:
                    "none"
            };
        }


        const requestedState =
            this.safeString(
                region.acousticState,
                "uncertain"
            );


        const acousticState =
            this.isValidAcousticState(
                requestedState
            )
                ? requestedState
                : "uncertain";


        return {

            support:
                this.safeNumber(
                    region.support
                ),

            confidence:
                this.clamp(
                    this.safeNumber(
                        region.confidence
                    ),
                    0,
                    1
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
                ),

            acousticState:
                acousticState,

            stateConfidence:
                this.clamp(
                    this.safeNumber(
                        region.stateConfidence
                    ),
                    0,
                    1
                ),

            stateEvidence:
                this.safeString(
                    region.stateEvidence,
                    "none"
                ),

            temporalEvidence:
                this.safeBoolean(
                    region.temporalEvidence
                ),

            regionalMeasurement:
                this.safeBoolean(
                    region.regionalMeasurement
                ),

            energy:
                this.safeNumber(
                    region.energy
                ),

            energyShare:
                this.safeNumber(
                    region.energyShare
                ),

            normalizedEnergy:
                this.safeNumber(
                    region.normalizedEnergy
                ),

            relativeEnergy:
                this.safeNumber(
                    region.relativeEnergy
                ),

            stability:
                this.clamp(
                    this.safeNumber(
                        region.stability
                    ),
                    0,
                    1
                ),

            activity:
                this.clamp(
                    this.safeNumber(
                        region.activity
                    ),
                    0,
                    1
                ),

            bandCount:
                this.safeNumber(
                    region.bandCount
                ),

            lowHz:
                this.safeNumber(
                    region.lowHz
                ),

            highHz:
                this.safeNumber(
                    region.highHz
                ),

            evidenceLevel:
                this.safeString(
                    region.evidenceLevel,
                    "none"
                )
        };
    }


    // ======================================
    // MAPEAR MEDIÇÃO REGIONAL
    // ======================================

    getRegionalMeasurementMap() {

        return {

            sub:
                "sub",

            bass:
                "bass",

            body:
                "body",

            lowMid:
                "lowMid",

            mid:
                "mid",

            presence:
                "presence",

            upperPresence:
                "upperPresence",

            sibilance:
                "sibilance",

            air:
                "air"
        };
    }


    // ======================================
    // ENRIQUECER REGIÕES COM MEDIÇÃO
    // ======================================

    mergeRegionalMeasurement(
        regions,
        regionalMeasurement
    ) {

        const baseRegions =
            regions &&
            typeof regions ===
            "object"

                ? regions
                : {};


        const measurement =
            regionalMeasurement &&
            typeof regionalMeasurement ===
            "object"

                ? regionalMeasurement
                : null;


        if (
            !measurement ||
            !measurement.regions ||
            typeof measurement.regions !==
            "object"
        ) {

            return baseRegions;
        }


        const merged =
            {};


        const baseNames =
            Object.keys(
                baseRegions
            );


        for (
            let i = 0;
            i < baseNames.length;
            i++
        ) {

            const name =
                baseNames[i];


            merged[name] =
                baseRegions[name];
        }


        const map =
            this.getRegionalMeasurementMap();


        const measurementNames =
            Object.keys(
                map
            );


        for (
            let i = 0;
            i < measurementNames.length;
            i++
        ) {

            const observerName =
                measurementNames[i];


            const measurementName =
                map[
                    observerName
                ];


            const measuredRegion =
                measurement
                    .regions[
                        measurementName
                    ];


            if (
                !measuredRegion
            ) {

                continue;
            }


            const existingRegion =
                merged[
                    observerName
                ] || {};


            merged[
                observerName
            ] = {

                ...existingRegion,

                lowHz:
                    measuredRegion.lowHz ??
                    existingRegion.lowHz,

                highHz:
                    measuredRegion.highHz ??
                    existingRegion.highHz,

                bandCount:
                    measuredRegion.bandCount ??
                    0,

                energy:
                    measuredRegion.energy ??
                    0,

                energyShare:
                    measuredRegion.energyShare ??
                    0,

                relativeEnergy:
                    measuredRegion.relativeEnergy ??
                    0,

                normalizedEnergy:
                    measuredRegion.normalizedEnergy ??
                    0,

                stability:
                    measuredRegion.stability ??
                    0,

                confidence:
                    measuredRegion.confidence ??
                    0,

                activity:
                    measuredRegion.activity ??
                    0,

                temporalEvidence:
                    measuredRegion.temporalEvidence ===
                    true,

                evidence:
                    measuredRegion.evidence ||
                    "none",

                evidenceLevel:
                    measuredRegion.evidenceLevel ||
                    measuredRegion.evidence ||
                    "none",

                usable:
                    measuredRegion.usable ===
                    true,

                regionalMeasurement:
                    measuredRegion.regionalMeasurement ===
                    true,

                regionSpecificEvidence:
                    measuredRegion.regionSpecificEvidence ===
                    true,

                stateConfidence:
                    measuredRegion.stateConfidence ??
                    0,

                acousticState:
                    this.isValidAcousticState(
                        measuredRegion.acousticState
                    )
                        ? measuredRegion.acousticState
                        : "uncertain",

                stateEvidence:
                    measuredRegion.stateEvidence ||
                    "none",

                evidenceSource:
                    "spectral-regional-measurement",

                reason:
                    measuredRegion.reason ||
                    "regional-measurement-available",

                measurementBandCount:
                    measuredRegion.bandCount ??
                    0
            };
        }


        return merged;
    }


    // ======================================
    // EVIDÊNCIA SUFICIENTE
    // ======================================

    hasSufficientEvidence(
        region
    ) {

        if (
            !region
        ) {

            return false;
        }


        const confidence =
            this.clamp(
                this.safeNumber(
                    region.confidence
                ),
                0,
                1
            );


        const support =
            this.clamp(
                this.safeNumber(
                    region.support
                ),
                0,
                1
            );


        const stability =
            this.clamp(
                this.safeNumber(
                    region.stability
                ),
                0,
                1
            );


        const regionalEvidence =
            region.regionSpecificEvidence ===
            true;


        if (
            confidence <
            this.minimumConfidence
        ) {

            return false;
        }


        if (
            support <
            this.minimumRegionalEvidence
        ) {

            return false;
        }


        if (
            stability <
            this.minimumStability
        ) {

            return false;
        }


        if (
            !regionalEvidence
        ) {

            return false;
        }


        return true;
    }


    // ======================================
    // CLASSIFICAR ENERGIA REGIONAL
    // ======================================
    //
    // IMPORTANTE:
    //
    // Esta função não decide tratamento.
    //
    // Ela somente transforma evidência
    // suficientemente confiável em uma
    // classificação observacional.
    //
    // ======================================

    classifyEnergyState(
        region
    ) {

        if (
            !region
        ) {

            return {

                state:
                    "uncertain",

                confidence:
                    0,

                evidence:
                    "region-unavailable"
            };
        }


        if (
            !this.hasSufficientEvidence(
                region
            )
        ) {

            return {

                state:
                    "uncertain",

                confidence:
                    this.clamp(
                        this.safeNumber(
                            region.confidence
                        ) *
                        0.5,
                        0,
                        1
                    ),

                evidence:
                    "insufficient-regional-evidence"
            };
        }


        const relativeEnergy =
            this.safeNumber(
                region.relativeEnergy,
                NaN
            );


        /*
         * Se relativeEnergy não estiver
         * disponível, não tentamos deduzir
         * um estado através de energia bruta.
         */

        if (
            !Number.isFinite(
                relativeEnergy
            )
        ) {

            return {

                state:
                    "uncertain",

                confidence:
                    0,

                evidence:
                    "relative-energy-unavailable"
            };
        }


        const confidence =
            this.clamp(
                (
                    this.safeNumber(
                        region.confidence
                    ) *
                    0.55
                ) +
                (
                    this.safeNumber(
                        region.stability
                    ) *
                    0.25
                ) +
                (
                    this.safeBoolean(
                        region.temporalEvidence
                    )
                        ? 0.20
                        : 0
                ),
                0,
                1
            );


        if (
            relativeEnergy >=
            this.highRelativeEnergy
        ) {

            return {

                state:
                    "elevated",

                confidence:
                    confidence,

                evidence:
                    "relative-energy-elevated"
            };
        }


        if (
            relativeEnergy <=
            this.lowRelativeEnergy
        ) {

            return {

                state:
                    "recessed",

                confidence:
                    confidence,

                evidence:
                    "relative-energy-recessed"
            };
        }


        if (
            relativeEnergy >=
            this.naturalRelativeMin &&
            relativeEnergy <=
            this.naturalRelativeMax
        ) {

            return {

                state:
                    "natural",

                confidence:
                    confidence,

                evidence:
                    "relative-energy-balanced"
            };
        }


        return {

            state:
                "uncertain",

            confidence:
                confidence * 0.5,

            evidence:
                "relative-energy-ambiguous"
        };
    }


    // ======================================
    // DETECTAR INSTABILIDADE
    // ======================================

    classifyStability(
        region
    ) {

        if (
            !region
        ) {

            return false;
        }


        const stability =
            this.clamp(
                this.safeNumber(
                    region.stability
                ),
                0,
                1
            );


        return stability <
            this.minimumStability;
    }


    // ======================================
    // DETECTAR ATIVIDADE INSUFICIENTE
    // ======================================

    hasMeaningfulActivity(
        region
    ) {

        if (
            !region
        ) {

            return false;
        }


        return this.safeNumber(
            region.activity
        ) >=
        this.minimumActivity;
    }


    // ======================================
    // DETECTAR MASCARAMENTO
    // ======================================
    //
    // "masked" não significa simplesmente
    // energia baixa.
    //
    // É usado quando a própria evidência
    // indica que a região pode estar sendo
    // perceptualmente encoberta por outra
    // região.
    //
    // ======================================

    detectMaskedState(
        region
    ) {

        if (
            !region
        ) {

            return false;
        }


        const reason =
            this.safeString(
                region.reason,
                ""
            )
                .toLowerCase();


        const evidence =
            this.safeString(
                region.evidence,
                ""
            )
                .toLowerCase();


        if (
            reason.indexOf(
                "mask"
            ) !== -1
        ) {

            return true;
        }


        if (
            evidence.indexOf(
                "mask"
            ) !== -1
        ) {

            return true;
        }


        return false;
    }


    // ======================================
    // CLASSIFICAÇÃO FINAL DA REGIÃO
    // ======================================
    //
    // Ordem deliberadamente conservadora:
    //
    // 1. dados ausentes
    // 2. atividade insuficiente
    // 3. instabilidade
    // 4. mascaramento comprovado
    // 5. energia regional
    // 6. fallback uncertain
    //
    // ======================================

    classifyRegion(
        region
    ) {

        const safeRegion =
            this.copyRegion(
                region
            );


        if (
            !safeRegion.usable &&
            !safeRegion.regionalMeasurement
        ) {

            return {

                ...safeRegion,

                acousticState:
                    "uncertain",

                stateConfidence:
                    0,

                stateEvidence:
                    "region-not-usable"
            };
        }


        if (
            !this.hasMeaningfulActivity(
                safeRegion
            )
        ) {

            return {

                ...safeRegion,

                acousticState:
                    "uncertain",

                stateConfidence:
                    0,

                stateEvidence:
                    "insufficient-activity"
            };
        }


        if (
            this.classifyStability(
                safeRegion
            )
        ) {

            return {

                ...safeRegion,

                acousticState:
                    "unstable",

                stateConfidence:
                    this.clamp(
                        safeRegion.confidence *
                        0.5,
                        0,
                        1
                    ),

                stateEvidence:
                    "regional-instability"
            };
        }


        if (
            this.detectMaskedState(
                safeRegion
            )
        ) {

            return {

                ...safeRegion,

                acousticState:
                    "masked",

                stateConfidence:
                    this.clamp(
                        safeRegion.confidence *
                        0.75,
                        0,
                        1
                    ),

                stateEvidence:
                    "masking-evidence"
            };
        }


        const classification =
            this.classifyEnergyState(
                safeRegion
            );


        return {

            ...safeRegion,

            acousticState:
                classification.state,

            stateConfidence:
                classification.confidence,

            stateEvidence:
                classification.evidence
        };
    }


    // ======================================
    // CLASSIFICAR TODAS AS REGIÕES
    // ======================================

    classifyRegions(
        regions
    ) {

        const source =
            regions &&
            typeof regions ===
            "object"

                ? regions
                : {};


        const result =
            {};


        const names =
            Object.keys(
                source
            );


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const name =
                names[i];


            result[name] =
                this.classifyRegion(
                    source[name]
                );
        }


        return result;
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
                    null,

                regionalMeasurement:
                    null
            };
        }


        const spectral =
            context.spectral;


        const baseRegions =
            context.regions ||
            {};


        const mergedRegions =
            this.mergeRegionalMeasurement(
                baseRegions,
                context.regionalMeasurement
            );


        const classifiedRegions =
            this.classifyRegions(
                mergedRegions
            );


        const policy =
            context.decisionPolicy ||
            {};


        const safety =
            context.safety ||
            {};


        const regionalMeasurement =
            context.regionalMeasurement &&
            typeof context.regionalMeasurement ===
            "object"

                ? {

                    valid:
                        this.safeBoolean(
                            context
                                .regionalMeasurement
                                .valid
                        ),

                    available:
                        this.safeBoolean(
                            context
                                .regionalMeasurement
                                .available
                        ),

                    confidence:
                        this.clamp(
                            this.safeNumber(
                                context
                                    .regionalMeasurement
                                    .confidence
                            ),
                            0,
                            1
                        ),

                    evidence:
                        this.safeString(
                            context
                                .regionalMeasurement
                                .evidence,
                            "none"
                        ),

                    regionCount:
                        this.safeNumber(
                            context
                                .regionalMeasurement
                                .regionCount
                        ),

                    usableRegions:
                        this.safeNumber(
                            context
                                .regionalMeasurement
                                .usableRegions
                        ),

                    supportedRegions:
                        this.safeNumber(
                            context
                                .regionalMeasurement
                                .supportedRegions
                        ),

                    temporalEvidence:
                        this.clamp(
                            this.safeNumber(
                                context
                                    .regionalMeasurement
                                    .temporalEvidence
                            ),
                            0,
                            1
                        ),

                    processingPermission:
                        "none"

                }

                : null;


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

                confidence:
                    this.clamp(
                        this.safeNumber(
                            spectral.confidence
                        ),
                        0,
                        1
                    ),

                tonalConfidence:
                    this.clamp(
                        this.safeNumber(
                            spectral.tonalConfidence
                        ),
                        0,
                        1
                    ),

                tonalTendency:
                    this.safeString(
                        spectral.tonalTendency,
                        "unknown"
                    ),

                closestReference:
                    this.safeString(
                        spectral.closestReference,
                        "unknown"
                    ),

                referenceSeparationDb:
                    this.safeNumber(
                        spectral.referenceSeparationDb
                    ),

                ambiguous:
                    this.safeBoolean(
                        spectral.ambiguous
                    ),

                actionable:
                    this.safeBoolean(
                        spectral.actionable
                    )
            },

            regions:
                classifiedRegions,

            decisionPolicy: {

                processingAuthority:
                    "none",

                observationOnly:
                    true,

                minimumConfidence:
                    this.minimumConfidence,

                minimumRegionalEvidence:
                    this.minimumRegionalEvidence
            },

            safety: {

                status:
                    this.safeString(
                        safety.status,
                        "observe"
                    ),

                permission:
                    "none",

                processingAllowed:
                    false,

                reason:
                    "diagnostic-observer-only"
            },

            regionalMeasurement:
                regionalMeasurement
        };
    }


    // ======================================
    // RESUMO DOS ESTADOS
    // ======================================

    summarizeStates(
        regions
    ) {

        const counts = {

            natural:
                0,

            elevated:
                0,

            recessed:
                0,

            unstable:
                0,

            masked:
                0,

            uncertain:
                0,

            contextual:
                0,

            supported:
                0
        };


        const source =
            regions &&
            typeof regions ===
            "object"

                ? regions
                : {};


        const names =
            Object.keys(
                source
            );


        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const state =
                source[
                    names[i]
                ].acousticState;


            if (
                this.isValidAcousticState(
                    state
                )
            ) {

                counts[state]++;
            }
        }


        return counts;
    }


    // ======================================
    // INTERPRETAR SNAPSHOT
    // ======================================

    interpret(
        snapshot
    ) {

        if (
            !snapshot ||
            snapshot.valid !== true
        ) {

            return {

                valid:
                    false,

                confidence:
                    0,

                observationOnly:
                    true,

                processingPermission:
                    "none",

                stateSummary:
                    this.summarizeStates(
                        {}
                    ),

                conclusion:
                    "diagnostic-context-invalid"
            };
        }


        const stateSummary =
            this.summarizeStates(
                snapshot.regions
            );


        const regionNames =
            Object.keys(
                snapshot.regions
            );


        let usableCount =
            0;


        let confidentCount =
            0;


        let uncertainCount =
            0;


        for (
            let i = 0;
            i < regionNames.length;
            i++
        ) {

            const region =
                snapshot.regions[
                    regionNames[i]
                ];


            if (
                region.usable
            ) {

                usableCount++;
            }


            if (
                region.stateConfidence >=
                this.minimumConfidence
            ) {

                confidentCount++;
            }


            if (
                region.acousticState ===
                "uncertain"
            ) {

                uncertainCount++;
            }
        }


        const regionalConfidence =
            snapshot.regionalMeasurement
                ? snapshot.regionalMeasurement
                    .confidence
                : 0;


        const confidence =
            this.clamp(
                (
                    snapshot.spectral.confidence *
                    0.40
                ) +
                (
                    regionalConfidence *
                    0.40
                ) +
                (
                    regionNames.length > 0
                        ? (
                            confidentCount /
                            regionNames.length
                        ) *
                        0.20
                        : 0
                ),
                0,
                1
            );


        let conclusion =
            "insufficient-evidence";


        if (
            confidence >=
            this.minimumConfidence
        ) {

            if (
                stateSummary.unstable >
                0
            ) {

                conclusion =
                    "regional-behavior-requires-caution";

            } else if (
                stateSummary.uncertain >
                0 &&
                uncertainCount >=
                Math.ceil(
                    regionNames.length *
                    0.5
                )
            ) {

                conclusion =
                    "evidence-remains-uncertain";

            } else {

                conclusion =
                    "regional-evidence-coherent";
            }
        }


        return {

            valid:
                true,

            confidence:
                confidence,

            observationOnly:
                true,

            processingPermission:
                "none",

            stateSummary:
                stateSummary,

            usableRegions:
                usableCount,

            confidentRegions:
                confidentCount,

            uncertainRegions:
                uncertainCount,

            conclusion:
                conclusion
        };
    }


    // ======================================
    // OBSERVAR
    // ======================================
    //
    // API principal utilizada pelo
    // VocalSmoother.
    //
    // ======================================

    observe(
        context,
        regionalMeasurement = null
    ) {

        /*
         * Compatibilidade:
         *
         * A medição pode chegar como segundo
         * argumento pelo VocalSmoother.
         *
         * Ela é anexada ao contexto somente
         * para observação.
         */

        let safeContext =
            context;


        if (
            regionalMeasurement
        ) {

            safeContext = {

                ...(
                    context || {}
                ),

                regionalMeasurement:
                    regionalMeasurement
            };
        }


        const snapshot =
            this.createSnapshot(
                safeContext
            );


        const interpretation =
            this.interpret(
                snapshot
            );


        this.lastSnapshot =
            snapshot;


        this.lastInterpretation =
            interpretation;


        return {

            snapshot:
                snapshot,

            interpretation:
                interpretation,

            processingPermission:
                "none",

            processingAllowed:
                false
        };
    }


    // ======================================
    // GETTERS
    // ======================================

    getLastSnapshot() {

        return this.lastSnapshot;
    }


    getLastInterpretation() {

        return this.lastInterpretation;
    }


    getLastRegions() {

        if (
            !this.lastSnapshot
        ) {

            return {};
        }


        return this.lastSnapshot.regions ||
            {};
    }


    getLastStateSummary() {

        if (
            !this.lastSnapshot
        ) {

            return this.summarizeStates(
                {}
            );
        }


        return this.summarizeStates(
            this.lastSnapshot.regions
        );
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralDiagnosticObserver =
    SpectralDiagnosticObserver;