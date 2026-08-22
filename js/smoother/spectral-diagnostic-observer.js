// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL DIAGNOSTIC OBSERVER
// V0.9
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
// - validar consistência das evidências;
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

        this.version = "0.9";

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

        this.minimumCoherence =
            options.minimumCoherence ?? 0.50;

        this.maximumUncertainRatio =
            options.maximumUncertainRatio ?? 0.50;

        this.maximumConflictRatio =
            options.maximumConflictRatio ?? 0.40;

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


    normalizeConfidence(value) {

        const number =
            this.safeNumber(value, 0);

        if (!Number.isFinite(number)) {
            return 0;
        }

        return this.clamp(
            number,
            0,
            1
        );
    }


    // ======================================
    // CONFIANÇA CONTEXTUAL BASEADA EM
    // EVIDÊNCIAS
    // ======================================

    calculateContextualEvidenceQuality(
        regionNames,
        regions
    ) {

        const names =
            Array.isArray(regionNames)
                ? regionNames
                    .filter(
                        name =>
                            typeof name ===
                            "string"
                    )
                : [];

        if (names.length === 0) {
            return 0;
        }

        const source =
            regions &&
            typeof regions === "object"
                ? regions
                : {};

        const qualities = [];

        names.forEach(
            name => {

                const region =
                    source[name];

                if (!region) {
                    qualities.push(0);
                    return;
                }

                // ----------------------------------
                // SEGURANÇA: REGIÃO NÃO UTILIZÁVEL
                // ----------------------------------
                //
                // Uma região marcada como não
                // utilizável não deve contribuir
                // para a confiança contextual como
                // se fosse uma evidência válida.
                //
                if (
                    region.usable !== true
                ) {

                    qualities.push(0);
                    return;
                }

                const evidenceWeight =
                    this.evidenceLevelWeight(
                        region.evidenceLevel
                    );

                const confidence =
                    this.normalizeConfidence(
                        region.confidence
                    );

                const stateConfidence =
                    this.normalizeConfidence(
                        region.stateConfidence
                    );

                const stability =
                    this.normalizeConfidence(
                        region.stability
                    );

                const temporalEvidence =
                    region.temporalEvidence === true
                        ? 1
                        : 0;

                const regionSpecificEvidence =
                    region.regionSpecificEvidence === true
                        ? 1
                        : 0;

                // ----------------------------------
                // QUALIDADE DA ATIVIDADE
                // ----------------------------------
                //
                // Quando a atividade está abaixo
                // do mínimo necessário, a região
                // continua observável, mas sua
                // contribuição para a confiança
                // deve ser reduzida.
                //
                // Acima do mínimo, não há bônus.
                //
                const activity =
                    this.normalizeConfidence(
                        region.activity
                    );

                const activityQuality =
                    this.minimumActivity > 0
                        ? this.clamp(
                            activity /
                            this.minimumActivity,
                            0,
                            1
                        )
                        : 1;

                const quality =
                    (
                        evidenceWeight *
                        0.27
                    ) +
                    (
                        confidence *
                        0.23
                    ) +
                    (
                        stateConfidence *
                        0.18
                    ) +
                    (
                        stability *
                        0.10
                    ) +
                    (
                        temporalEvidence *
                        0.05
                    ) +
                    (
                        regionSpecificEvidence *
                        0.10
                    ) +
                    (
                        activityQuality *
                        0.07
                    );

                qualities.push(
                    this.clamp(
                        quality,
                        0,
                        1
                    )
                );
            }
        );

        if (qualities.length === 0) {
            return 0;
        }

        return this.clamp(
            qualities.reduce(
                (
                    total,
                    quality
                ) =>
                    total + quality,
                0
            ) /
            qualities.length,
            0,
            1
        );
    }


    applyContextualEvidenceConfidence(
        pattern,
        regions
    ) {

        if (
            !pattern ||
            typeof pattern !== "object"
        ) {
            return pattern;
        }

        const baseConfidence =
            this.clamp(
                this.safeNumber(
                    pattern.confidence
                ),
                0,
                1
            );

        const evidenceRegions =
            Array.isArray(
                pattern.evidenceRegions
            )
                ? pattern.evidenceRegions
                : [];

        const evidenceQuality =
            this.calculateContextualEvidenceQuality(
                evidenceRegions,
                regions
            );

        const adjustedConfidence =
            baseConfidence *
            evidenceQuality;

        return {
            ...pattern,

            confidence:
                this.clamp(
                    adjustedConfidence,
                    0,
                    baseConfidence
                ),

            confidenceBase:
                baseConfidence,

            evidenceQuality:
                this.clamp(
                    evidenceQuality,
                    0,
                    1
                )
        };
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


    isValidEvidenceLevel(level) {

        return [
            "measure",
            "strong-inference",
            "moderate-inference",
            "hypothesis",
            "indeterminate",
            "none"
        ].includes(level);
    }


    normalizeEvidenceLevel(level) {

        const normalized =
            this.safeString(
                level,
                "none"
            );

        return this.isValidEvidenceLevel(
            normalized
        )
            ? normalized
            : "none";
    }


    evidenceLevelWeight(level) {

        switch (
            this.normalizeEvidenceLevel(
                level
            )
        ) {

            case "measure":
                return 1.00;

            case "strong-inference":
                return 0.85;

            case "moderate-inference":
                return 0.65;

            case "hypothesis":
                return 0.40;

            case "indeterminate":
                return 0.10;

            default:
                return 0;
        }
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
                this.normalizeConfidence(
                    region.support
                ),

            confidence:
                this.normalizeConfidence(
                    region.confidence
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
                this.normalizeConfidence(
                    region.stateConfidence
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
                this.normalizeConfidence(
                    region.stability
                ),

            activity:
                this.normalizeConfidence(
                    region.activity
                ),

            bandCount:
                Math.max(
                    0,
                    this.safeNumber(
                        region.bandCount
                    )
                ),

            lowHz:
                Math.max(
                    0,
                    this.safeNumber(
                        region.lowHz
                    )
                ),

            highHz:
                Math.max(
                    0,
                    this.safeNumber(
                        region.highHz
                    )
                ),

            evidenceLevel:
                this.normalizeEvidenceLevel(
                    region.evidenceLevel
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


        const evidenceWeight =
            this.evidenceLevelWeight(
                region.evidenceLevel
            );


        return (

            region.confidence >=
                this.minimumConfidence &&

            region.support >=
                this.minimumRegionalEvidence &&

            region.stability >=
                this.minimumStability &&

            region.regionSpecificEvidence ===
                true &&

            evidenceWeight >=
                this.evidenceLevelWeight(
                    "moderate-inference"
                )
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
    // DETECÇÃO DE CONFLITO
    // ======================================

    detectEvidenceConflicts(regions) {

        const r =
            regions || {};

        const names =
            Object.keys(r);


        if (
            names.length === 0
        ) {

            return {

                conflict: true,

                conflictRatio: 1,

                conflicts: [
                    "no-regional-evidence"
                ]
            };
        }


        const conflicts = [];


        const lowStates = [
            "bass",
            "body",
            "lowMid"
        ];


        const upperStates = [
            "presence",
            "upperPresence",
            "air"
        ];


        const lowElevated =
            lowStates.filter(
                name =>
                    r[name] &&
                    r[name].acousticState ===
                        "elevated"
            ).length;


        const upperRecessed =
            upperStates.filter(
                name =>
                    r[name] &&
                    r[name].acousticState ===
                        "recessed"
            ).length;


        if (
            lowElevated > 0 &&
            upperRecessed > 0
        ) {

            // Isso é um padrão espectral,
            // não um conflito por si só.
            //
            // Portanto NÃO adicionamos
            // conflito aqui.
        }


        const unstable =
            names.filter(
                name =>
                    r[name] &&
                    r[name].acousticState ===
                        "unstable"
            ).length;


        if (
            unstable >
            names.length *
            this.maximumConflictRatio
        ) {

            conflicts.push(
                "regional-instability-dominant"
            );
        }


        const uncertain =
            names.filter(
                name =>
                    !r[name] ||
                    r[name].acousticState ===
                        "uncertain"
            ).length;


        const uncertainRatio =
            uncertain /
            names.length;


        if (
            uncertainRatio >
            this.maximumUncertainRatio
        ) {

            conflicts.push(
                "uncertainty-dominant"
            );
        }


        const strongStates =
            names.filter(
                name => {

                    const region =
                        r[name];

                    if (!region) {
                        return false;
                    }

                    return (
                        region.stateConfidence >=
                        this.minimumConfidence &&
                        region.evidenceLevel !==
                            "hypothesis"
                    );
                }
            ).length;


        const coherence =
            names.length > 0
                ? strongStates /
                    names.length
                : 0;


        if (
            coherence <
            this.minimumCoherence
        ) {

            conflicts.push(
                "insufficient-coherent-regional-support"
            );
        }


        const conflictRatio =
            this.clamp(

                conflicts.length /
                3,

                0,
                1
            );


        return {

            conflict:
                conflicts.length > 0,

            conflictRatio,

            conflicts
        };
    }


    // ======================================
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

            const evidenceRegions = [];

            if (
                bass === "elevated"
            ) {
                evidenceRegions.push(
                    "bass"
                );
            }

            if (
                body === "elevated"
            ) {
                evidenceRegions.push(
                    "body"
                );
            }

            if (
                presence === "recessed"
            ) {
                evidenceRegions.push(
                    "presence"
                );
            }

            if (
                upperPresence ===
                    "recessed"
            ) {
                evidenceRegions.push(
                    "upperPresence"
                );
            }

            patterns.push({

                id:
                    "low-heavy-upper-recessed",

                type:
                    "spectral-imbalance",

                confidence:
                    0.70,

                evidenceRegions,

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

                evidenceRegions: [
                    "body",
                    "lowMid"
                ],

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

            const evidenceRegions = [
                "presence"
            ];

            if (
                upperPresence ===
                    "recessed"
            ) {
                evidenceRegions.push(
                    "upperPresence"
                );
            }

            if (
                air === "recessed"
            ) {
                evidenceRegions.push(
                    "air"
                );
            }

            patterns.push({

                id:
                    "upper-spectrum-recessed",

                type:
                    "presence-loss",

                confidence:
                    0.72,

                evidenceRegions,

                interpretation:
                    "Regiões superiores apresentam redução coerente.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // GRAVE ISOLADO
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

                evidenceRegions: [
                    "bass",
                    "body",
                    "lowMid"
                ],

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

                evidenceRegions: [
                    "presence",
                    "sibilance"
                ],

                interpretation:
                    "A ausência de energia superior pode mascarar a avaliação da sibilância.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // INSTABILIDADE
        // ----------------------------------

        const unstableRegionNames =
            Object.keys(r)
                .filter(
                    name =>
                        r[name] &&
                        r[name].acousticState ===
                            "unstable"
                );


        const unstableCount =
            unstableRegionNames.length;


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

                evidenceRegions:
                    unstableRegionNames,

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

                evidenceRegions:
                    names,

                interpretation:
                    "Grande parte das regiões permanece indeterminada.",

                treatmentAuthority:
                    "none"
            });
        }


        // ----------------------------------
        // CONFIANÇA DOS PADRÕES
        // ----------------------------------

        patterns.forEach(
            pattern => {

                const adjusted =
                    this.applyContextualEvidenceConfidence(
                        pattern,
                        r
                    );

                Object.assign(
                    pattern,
                    adjusted
                );

                pattern.confidence =
                    this.clamp(
                        this.safeNumber(
                            pattern.confidence
                        ),
                        0,
                        1
                    );
            }
        );


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


        const conflict =
            this.detectEvidenceConflicts(
                regions
            );


        if (
            conflict.conflict
        ) {

            globalState =
                "uncertain";

            globalConfidence =
                globalConfidence *
                (
                    1 -
                    conflict.conflictRatio
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

            globalConfidence:
                this.clamp(
                    globalConfidence,
                    0,
                    1
                ),

            patterns,

            evidenceConflicts:
                conflict,

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
                    this.normalizeConfidence(
                        spectral.confidence
                    ),

                tonalConfidence:
                    this.normalizeConfidence(
                        spectral.tonalConfidence
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
                    this.minimumRegionalEvidence,

                minimumCoherence:
                    this.minimumCoherence,

                fallbackState:
                    "uncertain"
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
                            this.normalizeConfidence(
                                regional.confidence
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
                            this.normalizeConfidence(
                                regional.temporalEvidence
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

                processingAllowed:
                    false,

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


        const conflict =
            snapshot
                .contextualDiagnosis
                ? snapshot
                    .contextualDiagnosis
                    .evidenceConflicts
                : {

                    conflict: true,

                    conflictRatio: 1,

                    conflicts: [
                        "contextual-diagnosis-unavailable"
                    ]
                };


        let confidence =
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


        // ----------------------------------
        // PENALIZAÇÃO DE CONFLITO
        // ----------------------------------

        if (
            conflict.conflict
        ) {

            confidence =
                confidence *
                (
                    1 -
                    conflict.conflictRatio
                );
        }


        // ----------------------------------
        // FALLBACK CONSERVADOR
        // ----------------------------------

        let conclusion =
            "insufficient-evidence";


        let diagnosticState =
            "uncertain";


        if (
            names.length === 0
        ) {

            conclusion =
                "no-regional-evidence";

            diagnosticState =
                "uncertain";

        } else if (
            uncertainRegions /
            names.length >
            this.maximumUncertainRatio
        ) {

            conclusion =
                "evidence-remains-uncertain";

            diagnosticState =
                "uncertain";

        } else if (
            conflict.conflict
        ) {

            conclusion =
                "evidence-conflict-requires-caution";

            diagnosticState =
                "uncertain";

        } else if (
            confidence <
            this.minimumConfidence
        ) {

            conclusion =
                "insufficient-confidence";

            diagnosticState =
                "uncertain";

        } else if (
            stateSummary.unstable >
            0
        ) {

            conclusion =
                "regional-behavior-requires-caution";

            diagnosticState =
                "contextual";

        } else {

            conclusion =
                "regional-evidence-coherent";

            diagnosticState =
                "contextual";
        }


        // ----------------------------------
        // AUTORIDADE FINAL
        // ----------------------------------

        //
        // Mesmo quando o diagnóstico é
        // coerente, esta camada continua
        // sem autoridade DSP.
        //

        const processingAllowed =
            false;


        const processingPermission =
            "none";


        return {

            valid: true,

            confidence,

            diagnosticState,

            observationOnly:
                true,

            processingPermission,

            processingAllowed,

            usableRegions,

            confidentRegions,

            uncertainRegions,

            stateSummary,

            evidenceConflicts:
                conflict,

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