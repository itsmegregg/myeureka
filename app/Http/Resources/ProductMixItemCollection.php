<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

class ProductMixItemCollection extends ResourceCollection
{
    public function toArray($request)
    {
        $items = $this->collection->map(function ($item) {
            $data = [
                'product_code' => $item->product_code ?? null,
                'product_description' => $item->product_description ?? null,
                'total_quantity' => isset($item->total_quantity) ? (int) $item->total_quantity : 0,
                'total_net_sales' => isset($item->total_net_sales) ? (float) number_format($item->total_net_sales, 2, '.', '') : 0.0,
                'combo_items' => [],
            ];

            if (isset($item->combo_items) && method_exists($item->combo_items, 'map')) {
                $data['combo_items'] = $item->combo_items->map(function ($combo) {
                    return [
                        'product_code' => $combo->product_code ?? null,
                        'description' => $combo->product_description ?? $combo->description ?? null,
                        'total_quantity' => isset($combo->total_quantity) ? (int) $combo->total_quantity : 0,
                        'net_sales' => isset($combo->net_sales) ? (float) number_format($combo->net_sales, 2, '.', '') : 0.0,
                    ];
                })->toArray();
            }

            return $data;
        });

        $meta = [];
        // If a paginator was passed, expose pagination meta
        if (is_object($this->resource)) {
            $meta = [
                'current_page' => method_exists($this->resource, 'currentPage') ? $this->resource->currentPage() : null,
                'last_page' => method_exists($this->resource, 'lastPage') ? $this->resource->lastPage() : null,
                'per_page' => method_exists($this->resource, 'perPage') ? $this->resource->perPage() : null,
                'total' => method_exists($this->resource, 'total') ? $this->resource->total() : $this->collection->count(),
            ];
        }

        return [
            'data' => $items,
            'meta' => $meta,
        ];
    }
}
