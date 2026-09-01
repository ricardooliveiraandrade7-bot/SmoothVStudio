"use strict";

class EQSignature {

constructor(options = {}) {

    this.options = {

        enabled: true,


        /*
         * =====================================================
         * ELIMINAÇÃO DE MUDDY
         * =====================================================
         */

        muddyBands: [

            {
                frequency: 280,
                gainDb: -1.5,
                q: 1.90
            },

            {
                frequency: 380,
                gainDb: -1.5,
                q: 0.90
            }
        ],


        /*
         * =====================================================
         * ELIMINAÇÃO DE OCO
         * =====================================================
         */

        hollowBands: [

            {
                frequency: 480,
                gainDb: -1.0,
                q: 2.00
            },

            {
                frequency: 700,
                gainDb: -1.0,
                q: 2.00
            }
        ],


        /*
         * =====================================================
         * ADIÇÃO DE PRESENÇA
         * =====================================================
         */

        presenceBand: {

            frequency: 1200,
            gainDb: 1.8,
            q: 0.90
        },


        /*
         * =====================================================
         * ELIMINAÇÃO DE DUREZA
         * =====================================================
         */

        hardnessBand: {

            frequency: 3150,
            gainDb: -2.0,
            q: 0.65
        },


        /*
         * =====================================================
         * ADIÇÃO DE BRILHO
         * =====================================================
         *
         * High Shelf.
         *
         * shelfSlope:
         * 0.707 = transição larga e musical.
         */

        brillianceShelf: {

            frequency: 5000,
            gainDb: 2.5,
            shelfSlope: 0.707
        },


        ...options
    };
}


/*
 * =========================================================
 * PROCESSAMENTO PRINCIPAL
 * =========================================================
 */

process(audioBuffer) {

    this.validateAudioBuffer(
        audioBuffer
    );


    /*
     * BYPASS REAL
     *
     * O buffer não é alterado.
     */

    if (
        this.options.enabled === false
    ) {

        return audioBuffer;
    }


    for (
        let channel = 0;
        channel < audioBuffer.numberOfChannels;
        channel++
    ) {

        const data =
            audioBuffer.getChannelData(
                channel
            );


        /*
         * -----------------------------------------------------
         * MUDDY
         * -----------------------------------------------------
         */

        this.applyPeakingBand(
            data,
            audioBuffer.sampleRate,
            this.options.muddyBands[0]
        );


        this.applyPeakingBand(
            data,
            audioBuffer.sampleRate,
            this.options.muddyBands[1]
        );


        /*
         * -----------------------------------------------------
         * OCO
         * -----------------------------------------------------
         */

        this.applyPeakingBand(
            data,
            audioBuffer.sampleRate,
            this.options.hollowBands[0]
        );


        this.applyPeakingBand(
            data,
            audioBuffer.sampleRate,
            this.options.hollowBands[1]
        );


        /*
         * -----------------------------------------------------
         * PRESENÇA
         * -----------------------------------------------------
         */

        this.applyPeakingBand(
            data,
            audioBuffer.sampleRate,
            this.options.presenceBand
        );


        /*
         * -----------------------------------------------------
         * DUREZA
         * -----------------------------------------------------
         */

        this.applyPeakingBand(
            data,
            audioBuffer.sampleRate,
            this.options.hardnessBand
        );


        /*
         * -----------------------------------------------------
         * BRILHO
         * -----------------------------------------------------
         */

        this.applyHighShelfBand(
            data,
            audioBuffer.sampleRate,
            this.options.brillianceShelf
        );
    }


    return audioBuffer;
}


/*
 * =========================================================
 * PEAKING
 * =========================================================
 */

applyPeakingBand(
    data,
    sampleRate,
    band
) {

    const filter =
        this.createPeakingFilter(
            band.frequency,
            band.q,
            band.gainDb,
            sampleRate
        );


    this.processFilter(
        data,
        filter
    );
}


/*
 * =========================================================
 * HIGH SHELF
 * =========================================================
 */

applyHighShelfBand(
    data,
    sampleRate,
    band
) {

    const filter =
        this.createHighShelfFilter(
            band.frequency,
            band.shelfSlope,
            band.gainDb,
            sampleRate
        );


    this.processFilter(
        data,
        filter
    );
}


/*
 * =========================================================
 * PEAKING FILTER
 * =========================================================
 */

createPeakingFilter(
    frequency,
    q,
    gainDb,
    sampleRate
) {

    const safeFrequency =
        Math.min(
            sampleRate * 0.45,
            Math.max(
                20,
                frequency
            )
        );


    const safeQ =
        Math.max(
            0.1,
            q
        );


    const omega =
        2 *
        Math.PI *
        safeFrequency /
        sampleRate;


    const sine =
        Math.sin(
            omega
        );


    const cosine =
        Math.cos(
            omega
        );


    const alpha =
        sine /
        (
            2 *
            safeQ
        );


    const A =
        Math.pow(
            10,
            gainDb /
            40
        );


    const b0 =
        1 +
        alpha *
        A;


    const b1 =
        -2 *
        cosine;


    const b2 =
        1 -
        alpha *
        A;


    const a0 =
        1 +
        alpha /
        A;


    const a1 =
        -2 *
        cosine;


    const a2 =
        1 -
        alpha /
        A;


    return {

        b0:
            b0 /
            a0,

        b1:
            b1 /
            a0,

        b2:
            b2 /
            a0,

        a1:
            a1 /
            a0,

        a2:
            a2 /
            a0
    };
}


/*
 * =========================================================
 * HIGH SHELF
 * =========================================================
 */

createHighShelfFilter(
    frequency,
    shelfSlope,
    gainDb,
    sampleRate
) {

    const safeFrequency =
        Math.min(
            sampleRate * 0.45,
            Math.max(
                20,
                frequency
            )
        );


    const safeSlope =
        Math.max(
            0.1,
            Math.min(
                1.0,
                shelfSlope
            )
        );


    const omega =
        2 *
        Math.PI *
        safeFrequency /
        sampleRate;


    const sine =
        Math.sin(
            omega
        );


    const cosine =
        Math.cos(
            omega
        );


    const A =
        Math.pow(
            10,
            gainDb /
            40
        );


    const alpha =
        sine /
        2 *
        Math.sqrt(
            (
                A +
                1 /
                A
            ) *
            (
                1 /
                safeSlope -
                1
            ) +
            2
        );


    const beta =
        2 *
        Math.sqrt(
            A
        ) *
        alpha;


    const b0 =
        A *
        (
            (
                A +
                1
            ) +
            (
                A -
                1
            ) *
            cosine +
            beta
        );


    const b1 =
        -2 *
        A *
        (
            (
                A -
                1
            ) +
            (
                A +
                1
            ) *
            cosine
        );


    const b2 =
        A *
        (
            (
                A +
                1
            ) +
            (
                A -
                1
            ) *
            cosine -
            beta
        );


    const a0 =
        (
            A +
            1
        ) -
        (
            A -
            1
        ) *
        cosine +
        beta;


    const a1 =
        2 *
        (
            (
                A -
                1
            ) -
            (
                A +
                1
            ) *
            cosine
        );


    const a2 =
        (
            A +
            1
        ) -
        (
            A -
            1
        ) *
        cosine -
        beta;


    return {

        b0:
            b0 /
            a0,

        b1:
            b1 /
            a0,

        b2:
            b2 /
            a0,

        a1:
            a1 /
            a0,

        a2:
            a2 /
            a0
    };
}


/*
 * =========================================================
 * BIQUAD
 * =========================================================
 */

processFilter(
    data,
    filter
) {

    let x1 = 0;
    let x2 = 0;

    let y1 = 0;
    let y2 = 0;


    for (
        let i = 0;
        i < data.length;
        i++
    ) {

        const input =
            data[i];


        const output =
            (
                filter.b0 *
                input
            ) +
            (
                filter.b1 *
                x1
            ) +
            (
                filter.b2 *
                x2
            ) -
            (
                filter.a1 *
                y1
            ) -
            (
                filter.a2 *
                y2
            );


        x2 =
            x1;

        x1 =
            input;

        y2 =
            y1;

        y1 =
            output;


        /*
         * Proteção contra NaN / Infinity.
         */

        data[i] =
    Number.isFinite(
        output
    ) ?
    output :
    input;
    }
}


/*
 * =========================================================
 * VALIDAÇÃO
 * =========================================================
 */

validateAudioBuffer(
    audioBuffer
) {

    if (
        !audioBuffer ||
        typeof audioBuffer.length !== "number" ||
        typeof audioBuffer.sampleRate !== "number" ||
        typeof audioBuffer.numberOfChannels !== "number" ||
        typeof audioBuffer.getChannelData !== "function"
    ) {

        throw new Error(
            "EQSignature: AudioBuffer inválido."
        );
    }


    if (
        audioBuffer.length <= 0 ||
        audioBuffer.sampleRate <= 0 ||
        audioBuffer.numberOfChannels <= 0
    ) {

        throw new Error(
            "EQSignature: áudio vazio ou inválido."
        );
    }
}

}

window.EQSignature =
EQSignature;