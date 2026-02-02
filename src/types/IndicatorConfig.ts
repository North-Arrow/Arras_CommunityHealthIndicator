export interface Icon {
    name: string;
    filename?: string;
}
export interface IndicatorConfig {
    legend?: {
        extra_layers?: {
            layer_name?: string | null;
            html?: string | null;
        };
        [key: string]: any;
    };
    map?: {
        size?: string;
        color?: string | null;
    };
    data_source: {
        text: string;
        url: string;
    };
    extra_layers?: {
        layer_name?: string;
        html?: string | null;
    };

    timeline: any;
    popup: any;
    title: string;
    geotype: string | 'tract' | 'county' | 'school' | 'facility';
    short_name: string;
    geolevel: string;
    default: 'left' | 'right' | false;
    google_sheets_url: string;
    google_sheets_data: any;
    source_name: string;
    layers: {
        [x: string]: any;
        main: string;
        outline: string;
        circle: string | null;
    };
    style: {
        colors: any;
        min: {
            color: string;
            value: number;
        };
        max: {
            color: string;
            value: number;
        };
    };
    icons: Icon[];
}
