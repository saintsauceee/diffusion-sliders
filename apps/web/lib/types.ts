export type Regime = 'prompt-only' | 'every-step';
export type Dimension = 'cfg' | 'temp' | 'top_k';
export type TokenMode = 'localized' | 'broadcast';

export interface InferenceImage {
  strength: number;
  layer: number;
  url: string;
}

export interface InferenceCell {
  strengths: InferenceImage[];
  grid: string | null;
}

export interface SweepValue {
  label: string;
  value: number;
  modes: Partial<Record<TokenMode, InferenceCell>>;
}

export type InferenceTree = Partial<
  Record<Regime, Partial<Record<Dimension, SweepValue[]>>>
>;

export interface ElasticBandImage {
  strength: number;
  url: string;
}

export interface ElasticBandSummary {
  concept?: string;
  prompt?: string;
  tokens_to_edit?: string[];
  layer?: number;
  steer_all_tokens?: boolean;
  seed?: number;
  cfg?: number;
  temperature?: number;
  image_top_k?: number;
  max_dreamsim_distance?: number;
  initialization?: {
    initial_min_projection_value?: number;
    effective_minimum_value?: number;
    search_minimum_value?: number;
    doubling_attempts?: { strength: number; dreamsim_to_reference: number }[];
  };
  valid_range?: {
    minimum_valid_value: number;
    maximum_valid_value: number;
  };
  all_generated_strengths?: number[];
  elastic_search_result?: {
    stop_reason?: string;
    final_control_points?: number[];
    valid_control_points?: number[];
    reference_distances?: Record<string, number>;
    iterations?: ElasticBandIteration[];
  };
}

export interface ElasticBandIteration {
  iteration: number;
  action: 'move' | 'expand' | string;
  reason?: string | null;
  control_points_before?: number[];
  control_points_after?: number[];
  reference_distances?: { strength: number; dreamsim_to_reference: number }[];
  neighbor_gaps?: { left: number; right: number; dreamsim_gap: number }[];
  normalized_neighbor_gaps?: number[];
  largest_gap_index?: number;
  inserted_midpoint?: number;
  updates?: {
    index: number;
    old_value: number;
    new_value: number;
    direction?: string;
    step_size?: number;
  }[];
  base_step?: number;
  move_threshold?: number;
}

export interface ElasticBand {
  strengths: ElasticBandImage[];
  summary: ElasticBandSummary | null;
}

export interface ConceptMeta {
  tokensToEdit: string[] | null;
  prompt?: string | null;
  defaults?: {
    cfg: number | null;
    temperature: number | null;
    image_top_k: number | null;
    seed: number | null;
    layer: number | null;
  };
}

export interface Concept {
  name: string;
  meta: ConceptMeta;
  inference: InferenceTree | null;
  elasticBand: ElasticBand | null;
}

export interface Tree {
  concepts: Concept[];
  generatedAt: string;
  source: string;
}
