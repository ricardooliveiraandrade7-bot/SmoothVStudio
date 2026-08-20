// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL DIAGNOSTIC OBSERVER
// V0.6
// ==========================================
//
// Camada de observação e interpretação
// contextual da inteligência espectral.
//
// RESPONSABILIDADE:
//
// - receber contexto espectral;
// - receber medições regionais;
// - validar evidências;
// - classificar estados acústicos;
// - correlacionar estados entre regiões;
// - produzir diagnóstico contextual;
// - calcular confiança diagnóstica;
// - manter fallback conservador.
//
// ESTE MÓDULO NÃO:
//
// - processa áudio;
// - cria filtros;
// - altera ganho;
// - altera timbre;
// - executa DSP;
// - gera EQ;
// - gera compressão;
// - gera de-esser;
// - executa TreatmentPlan.
//
// REGRA:
//
// DIAGNÓSTICO != TRATAMENTO
//
// ==========================================


class SpectralDiagnosticObserver {


    constructor(options = {}) {

        this.version = "0.6";

        this.minimumConfidence =
            options.minimumConfidence ?? 0.55;

        this.minimumRegionalEvidence =
            options.minimumRegionalEvidence ?? 0.60;

        this.minimumStability =
            options.minimumStability ?? 0.45;

        this.minimumActivity =
            options.minimumActivity ?? 0.08;

        this.highRelativeEnergy =
            options.highRelativeEnergy ?? 1.20;

        this.lowRelativeEnergy =
            options.lowRelativeEnergy ?? 0.80;

        this.naturalRelativeMin =
            options.naturalRelativeMin ?? 0.90;

        this.naturalRelativeMax =
            options.naturalRelativeMax ?? 1.10;

        this.lastSnapshot = null;

        this.lastInterpretation = null;
    }


    // ======================================
    // UTILITÁRIOS
    // ======================================

    safeNumber(value, fallback = 0) {

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }


    safeString(value, fallback = "unknown") {

        return typeof value === "string"
            ? value
            : fallback;
    }


    safeBoolean(value) {

        return value === true;
    }


    clamp(value, min, max) {

        return Math.min(
            max,
            Math.max(min, value)
        );
    }


    // ======================================
    // VALIDAÇÃO
    // ======================================

    validateContext(context) {

        if (
            !context ||
            typeof context !== "object"
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


    isValidAcousticState(state) {

        return [
            "natural",
            "elevated",
            "recessed",
            "unstable",
            "masked",
            "uncertain",
            "contextual",
            "supported"
        ].includes(state);
    }


    // ======================================
    // COPIAR REGIÃO
    // ======================================

    copyRegion(region) {

        if (
            !region ||
            typeof region !== "object"
        ) {

            return {

                support: 0,
                confidence: 0,
                evidence: "low",
                safety: "observe",
                usable: false,

                regionSpecificEvidence: false,
                evidenceSource: "unknown",
                reason: "region-unavailable",

                reference: "unknown",
                tonalDirection: "unknown",

                acousticState: "uncertain",
                stateConfidence: 0,
                stateEvidence: "none",

                temporalEvidence: false,
                regionalMeasurement: false,

                energy: 0,
                energyShare: 0,
                normalizedEnergy: 0,
                relativeEnergy: 0,

                stability: 0,
                activity: 0,

                bandCount: 0,
                lowHz: 0,
                highHz: 0,

                evidenceLevel: "none"
            };
        }


        const requestedState =
            this.safeString(
                region.acousticState,
                "uncertain"
            );


        return {

            support:
                this.safeNumber(region.support),

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
                this.isValidAcousticState(
                    requestedState
                )
                    ? requestedState
                    : "uncertain",

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
    // MAPA REGIONAL
    // ======================================

    getRegionalMeasurementMap() {

        return {

            sub: "sub",
            bass: "bass",
            body: "body",
            lowMid: "lowMid",
            mid: "mid",
            presence: "presence",
            upperPresence: "upperPresence",
            sibilance: "sibilance",
            air: "air"
        };
    }


    // ======================================
    // MESCLAR MEDIÇÃO
    // ======================================

    mergeRegionalMeasurement(
        regions,
        regionalMeasurement
    ) {

        const base =
            regions &&
            typeof regions === "object"
                ? regions
                : {};


        if (
            !regionalMeasurement ||
            typeof regionalMeasurement !==
                "object" ||
            !regionalMeasurement.regions ||
            typeof regionalMeasurement.regions !==
                "object"
        ) {

            return base;
        }


        const merged = {
            ...base
        };


        const map =
            this.getRegionalMeasurementMap();


        Object.keys(map).forEach(
            observerName => {

                const measurementName =
                    map[observerName];


                const measured =
                    regionalMeasurement
                        .regions[
                            measurementName
                        ];


                if (!measured) {
                    return;
                }


                const existing =
                    merged[
                        observerName
                    ] || {};


                merged[
                    observerName
                ] = {

                    ...existing,

                    lowHz:
                        measured.lowHz ??
                        existing.lowHz,

                    highHz:
                        measured.highHz ??
                        existing.highHz,

                    bandCount:
                        measured.bandCount ?? 0,

                    energy:
                        measured.energy ?? 0,

                    energyShare:
                        measured.energyShare ?? 0,

                    relativeEnergy:
                        measured.relativeEnergy ?? 0,

                    normalizedEnergy:
                        measured.normalizedEnergy ?? 0,

                    stability:
                        measured.stability ?? 0,

                    confidence:
                        measured.confidence ?? 0,

                    activity:
                        measured.activity ?? 0,

                    temporalEvidence:
                        measured.temporalEvidence === true,

                    evidence:
                        measured.evidence ||
                        "none",

                    evidenceLevel:
                        measured.evidenceLevel ||
                        measured.evidence ||
                        "none",

                    usable:
                        measured.usable === true,

                    regionalMeasurement:
                        measured.regionalMeasurement === true,

                    regionSpecificEvidence:
                        measured.regionSpecificEvidence === true,

                    stateConfidence:
                        measured.stateConfidence ?? 0,

                    acousticState:
                        this.isValidAcousticState(
                            measured.acousticState
                        )
                            ? measured.acousticState
                            : "uncertain",

                    stateEvidence:
                        measured.stateEvidence ||
                        "none",

                    evidenceSource:
                        "spectral-regional-measurement",

                    reason:
                        measured.reason ||
                        "regional-measurement-available"
                };
            }
        );


        return merged;
    }


    // ======================================
    // SUFICIÊNCIA
    // ======================================

    hasSufficientEvidence(region) {

        if (!region) {
            return false;
        }


        return (

            region.confidence >=
                this.minimumConfidence &&

            region.support >=
                this.minimumRegionalEvidence &&

            region.stability >=
                this.minimumStability &&

            region.regionSpecificEvidence ===
                true
        );
    }


    hasMeaningfulActivity(region) {

        if (!region) {
            return false;
        }


        return (
            region.activity >=
            this.minimumActivity
        );
    }


    classifyStability(region) {

        return (
            region &&
            region.stability <
                this.minimumStability
        );
    }


    detectMaskedState(region) {

        if (!region) {
            return false;
        }


        const reason =
            this.safeString(
                region.reason,
                ""
            ).toLowerCase();


        const evidence =
            this.safeString(
                region.evidence,
                ""
            ).toLowerCase();


        return (
            reason.includes("mask") ||
            evidence.includes("mask")
        );
    }


    // ======================================
    // CLASSIFICAÇÃO ENERGÉTICA
    // ======================================

    classifyEnergyState(region) {

        if (!region) {

            return {

                state: "uncertain",
                confidence: 0,
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

                state: "uncertain",

                confidence:
                    this.clamp(
                        region.confidence *
                        0.5,
                        0,
                        1
                    ),

                evidence:
                    "insufficient-regional-evidence"
            };
        }


        const relative =
            Number(
                region.relativeEnergy
            );


        if (
            !Number.isFinite(relative)
        ) {

            return {

                state: "uncertain",
                confidence: 0,
                evidence:
                    "relative-energy-unavailable"
            };
        }


        const confidence =
            this.clamp(

                (
                    region.confidence *
                    0.55
                ) +

                (
                    region.stability *
                    0.25
                ) +

                (
                    region.temporalEvidence
                        ? 0.20
                        : 0
                ),

                0,
                1
            );


        if (
            relative >=
            this.highRelativeEnergy
        ) {

            return {

                state: "elevated",
                confidence,
                evidence:
                    "relative-energy-elevated"
            };
        }


        if (
            relative <=
            this.lowRelativeEnergy
        ) {

            return {

                state: "recessed",
                confidence,
                evidence:
                    "relative-energy-recessed"
            };
        }


        if (
            relative >=
                this.naturalRelativeMin &&

            relative <=
                this.naturalRelativeMax
        ) {

            return {

                state: "natural",
                confidence,
                evidence:
                    "relative-energy-balanced"
            };
        }


        return {

            state: "uncertain",

            confidence:
                confidence * 0.5,

            evidence:
                "relative-energy-ambiguous"
        };
    }


    // ======================================
    // CLASSIFICAR REGIÃO
    // ======================================

    classifyRegion(region) {

        const safe =
            this.copyRegion(region);


        if (
            !safe.usable &&
            !safe.regionalMeasurement
        ) {

            return {

                ...safe,

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
                safe
            )
        ) {

            return {

                ...safe,

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
                safe
            )
        ) {

            return {

                ...safe,

                acousticState:
                    "unstable",

                stateConfidence:
                    this.clamp(
                        safe.confidence *
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
                safe
            )
        ) {

            return {

                ...safe,

                acousticState:
                    "masked",

                stateConfidence:
                    this.clamp(
                        safe.confidence *
                        0.75,
                        0,
                        1
                    ),

                stateEvidence:
                    "masking-evidence"
            };
        }


        const result =
            this.classifyEnergyState(
                safe
            );


        return {

            ...safe,

            acousticState:
                result.state,

            stateConfidence:
                result.confidence,

            stateEvidence:
                result.evidence
        };
    }


    // ======================================
    // CLASSIFICAR TODAS
    // ======================================

    classifyRegions(regions) {

        const source =
            regions &&
            typeof regions === "object"
                ? regions
                : {};


        const result = {};


        Object.keys(source).forEach(
            name => {

                result[name] =
                    this.classifyRegion(
                        source[name]
                    );
            }
        );


        return result;
    }


    // ======================================
    // ESTATÍSTICAS DOS ESTADOS
    // ======================================

    summarizeStates(regions) {

        const counts = {

            natural: 0,
            elevated: 0,
            recessed: 0,
            unstable: 0,
            masked: 0,
            uncertain: 0,
            contextual: 0,
            supported: 0
        };


        const source =
            regions &&
            typeof regions === "object"
                ? regions
                : {};


        Object.keys(source).forEach(
            name => {

                const state =
                    source[name]
                        .acousticState;


                if (
                    this.isValidAcousticState(
                        state
                    )
                ) {

                    counts[state]++;
                }
            }
        );


        return counts;
    }


    // ======================================
    // NOVO:
    // CORRELAÇÃO CONTEXTUAL
    // ======================================

    buildContextualDiagnosis(regions) {

        const r =
            regions || {};


        const getState =
            name =>
                r[name] &&
                r[name].acousticState
                    ? r[name].acousticState
                    : "uncertain";


        const bass =
            getState("bass");

        const body =
            getState("body");

        const lowMid =
            getState("lowMid");

        const mid =
            getState("mid");

        const presence =
            getState("presence");

        const upperPresence =
            getState(
                "upperPresence"
            );

        const sibilance =
            getState("sibilance");

        const air =
            getState("air");


        const patterns = [];


        // ----------------------------------
        // GRAVE/CORPO ELEVADOS
        // ----------------------------------

        if (
            (
                bass === "elevated" ||
                body === "elevated"
            ) &&
            (
                presence === "recessed" ||
                upperPresence ===
                    "recessed"
            )
        ) {

            patterns.push({

                id:
                    "low-heavy-upper-recessed",

                type:
                    "spectral-imbalance",

                confidence:
                    0.70,

                interpretation:
                    "Predominância relativa de regiões inferiores com redução nas regiões superiores.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // POSSÍVEL LAMA
        // ----------------------------------

        if (
            body === "elevated" &&
            lowMid === "elevated"
        ) {

            patterns.push({

                id:
                    "body-lowmid-elevated",

                type:
                    "body-congestion",

                confidence:
                    0.68,

                interpretation:
                    "Corpo e médio-grave apresentam elevação simultânea.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // PRESENÇA REDUZIDA
        // ----------------------------------

        if (
            presence === "recessed" &&
            (
                upperPresence ===
                    "recessed" ||
                air === "recessed"
            )
        ) {

            patterns.push({

                id:
                    "upper-spectrum-recessed",

                type:
                    "presence-loss",

                confidence:
                    0.72,

                interpretation:
                    "Regiões superiores apresentam redução coerente.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // GRAVE ISOLADO
        // ----------------------------------
        //
        // MUITO IMPORTANTE:
        //
        // grave elevado sozinho NÃO é
        // classificado como problema.
        //
        // ----------------------------------

        if (
            bass === "elevated" &&
            body !== "elevated" &&
            lowMid !== "elevated"
        ) {

            patterns.push({

                id:
                    "isolated-bass-elevation",

                type:
                    "context-dependent-bass",

                confidence:
                    0.52,

                interpretation:
                    "Elevação isolada de grave; pode representar característica natural da voz.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // PRESENÇA REDUZIDA + SIBILÂNCIA
        // ----------------------------------

        if (
            presence === "recessed" &&
            (
                sibilance ===
                    "uncertain" ||
                sibilance ===
                    "recessed"
            )
        ) {

            patterns.push({

                id:
                    "sibilance-masked",

                type:
                    "sibilance-uncertain",

                confidence:
                    0.58,

                interpretation:
                    "A ausência de energia superior pode mascarar a avaliação da sibilância.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // INSTABILIDADE
        // ----------------------------------

        const unstableCount =
            Object.values(
                r
            )
                .filter(
                    region =>
                        region &&
                        region.acousticState ===
                            "unstable"
                )
                .length;


        if (
            unstableCount > 0
        ) {

            patterns.push({

                id:
                    "regional-instability",

                type:
                    "unstable-spectrum",

                confidence:
                    0.65,

                interpretation:
                    "Uma ou mais regiões apresentam comportamento temporal instável.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // INCERTEZA GENERALIZADA
        // ----------------------------------

        const names =
            Object.keys(r);


        const uncertainCount =
            names.filter(
                name =>
                    getState(name) ===
                    "uncertain"
            ).length;


        if (
            names.length > 0 &&
            uncertainCount >=
                Math.ceil(
                    names.length * 0.5
                )
        ) {

            patterns.push({

                id:
                    "insufficient-context",

                type:
                    "uncertain",

                confidence:
                    0.80,

                interpretation:
                    "Grande parte das regiões permanece indeterminada.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // DIAGNÓSTICO GLOBAL
        // ----------------------------------

        let globalState =
            "uncertain";


        let globalConfidence =
            0;


        if (
            patterns.length === 0
        ) {

            globalState =
                "natural";

            globalConfidence =
                0.45;
        }


        if (
            patterns.length === 1
        ) {

            globalState =
                "contextual";

            globalConfidence =
                patterns[0]
                    .confidence;
        }


        if (
            patterns.length > 1
        ) {

            globalState =
                "contextual";

            globalConfidence =
                this.clamp(

                    patterns.reduce(
                        (
                            total,
                            pattern
                        ) =>
                            total +
                            pattern.confidence,
                        0
                    ) /
                    patterns.length,

                    0,
                    1
                );
        }


        if (
            patterns.some(
                pattern =>
                    pattern.type ===
                    "uncertain"
            )
        ) {

            globalState =
                "uncertain";
        }


        return {

            globalState,

            globalConfidence,

            patterns,

            treatmentAuthority:
                "none",

            processingAllowed:
                false
        };
    }


    // ======================================
    // SNAPSHOT
    // ======================================

    createSnapshot(context) {

        if (
            !this.validateContext(
                context
            )
        ) {

            return {

                valid: false,

                version:
                    this.version,

                reason:
                    "invalid-spectral-context",

                spectral: null,

                regions: {},

                contextualDiagnosis:
                    null,

                decisionPolicy: null,

                safety: null,

                regionalMeasurement:
                    null
            };
        }


        const spectral =
            context.spectral;


        const regions =
            this.classifyRegions(

                this.mergeRegionalMeasurement(
                    context.regions || {},
                    context.regionalMeasurement
                )
            );


        const contextualDiagnosis =
            this.buildContextualDiagnosis(
                regions
            );


        const regional =
            context.regionalMeasurement;


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

            regions,

            contextualDiagnosis,

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
                        context.safety.status,
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
                regional
                    ? {

                        valid:
                            this.safeBoolean(
                                regional.valid
                            ),

                        available:
                            this.safeBoolean(
                                regional.available
                            ),

                        confidence:
                            this.clamp(
                                this.safeNumber(
                                    regional.confidence
                                ),
                                0,
                                1
                            ),

                        evidence:
                            this.safeString(
                                regional.evidence,
                                "none"
                            ),

                        regionCount:
                            this.safeNumber(
                                regional.regionCount
                            ),

                        usableRegions:
                            this.safeNumber(
                                regional.usableRegions
                            ),

                        supportedRegions:
                            this.safeNumber(
                                regional.supportedRegions
                            ),

                        temporalEvidence:
                            this.clamp(
                                this.safeNumber(
                                    regional.temporalEvidence
                                ),
                                0,
                                1
                            ),

                        processingPermission:
                            "none"
                    }

                    : null
        };
    }


    // ======================================
    // INTERPRETAÇÃO
    // ======================================

    interpret(snapshot) {

        if (
            !snapshot ||
            snapshot.valid !== true
        ) {

            return {

                valid: false,

                confidence: 0,

                observationOnly:
                    true,

                processingPermission:
                    "none",

                stateSummary:
                    this.summarizeStates(
                        {}
                    ),

                contextualDiagnosis:
                    null,

                conclusion:
                    "diagnostic-context-invalid"
            };
        }


        const regions =
            snapshot.regions;


        const names =
            Object.keys(
                regions
            );


        const stateSummary =
            this.summarizeStates(
                regions
            );


        let confidentRegions =
            0;


        let uncertainRegions =
            0;


        let usableRegions =
            0;


        names.forEach(
            name => {

                const region =
                    regions[name];


                if (
                    region.usable
                ) {

                    usableRegions++;
                }


                if (
                    region.stateConfidence >=
                    this.minimumConfidence
                ) {

                    confidentRegions++;
                }


                if (
                    region.acousticState ===
                    "uncertain"
                ) {

                    uncertainRegions++;
                }
            }
        );


        const spectralConfidence =
            snapshot.spectral
                .confidence;


        const regionalConfidence =
            snapshot.regionalMeasurement
                ? snapshot
                    .regionalMeasurement
                    .confidence
                : 0;


        const regionalCoverage =
            names.length > 0
                ? (
                    confidentRegions /
                    names.length
                )
                : 0;


        const contextualConfidence =
            snapshot
                .contextualDiagnosis
                ? snapshot
                    .contextualDiagnosis
                    .globalConfidence
                : 0;


        const confidence =
            this.clamp(

                (
                    spectralConfidence *
                    0.30
                ) +

                (
                    regionalConfidence *
                    0.30
                ) +

                (
                    regionalCoverage *
                    0.20
                ) +

                (
                    contextualConfidence *
                    0.20
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
                uncertainRegions >=
                Math.ceil(
                    names.length * 0.5
                )
            ) {

                conclusion =
                    "evidence-remains-uncertain";

            } else if (
                stateSummary.unstable >
                0
            ) {

                conclusion =
                    "regional-behavior-requires-caution";

            } else {

                conclusion =
                    "regional-evidence-coherent";
            }
        }


        return {

            valid: true,

            confidence,

            observationOnly:
                true,

            processingPermission:
                "none",

            processingAllowed:
                false,

            usableRegions,

            confidentRegions,

            uncertainRegions,

            stateSummary,

            contextualDiagnosis:
                snapshot
                    .contextualDiagnosis,

            conclusion
        };
    }


    // ======================================
    // API PRINCIPAL
    // ======================================

    observe(
        context,
        regionalMeasurement = null
    ) {

        let safeContext =
            context;


        if (
            regionalMeasurement
        ) {

            safeContext = {

                ...(context || {}),

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

            snapshot,

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

        return this.lastSnapshot
            ? this.lastSnapshot.regions || {}
            : {};
    }


    getLastStateSummary() {

        return this.lastSnapshot
            ? this.summarizeStates(
                this.lastSnapshot.regions
            )
            : this.summarizeStates({});
    }


    getLastContextualDiagnosis() {

        return this.lastSnapshot
            ? this.lastSnapshot
                .contextualDiagnosis
            : null;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralDiagnosticObserver =
    SpectralDiagnosticObserver;