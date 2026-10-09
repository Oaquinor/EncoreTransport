<?php

namespace App\Exceptions;

use RuntimeException;

class MapProviderException extends RuntimeException
{
    public function __construct(
        private readonly string $service,
        private readonly int $upstreamStatus,
        private readonly string $publicCode,
        string $message,
    ) {
        parent::__construct($message, $upstreamStatus);
    }

    public function service(): string
    {
        return $this->service;
    }

    public function upstreamStatus(): int
    {
        return $this->upstreamStatus;
    }

    public function publicCode(): string
    {
        return $this->publicCode;
    }

    public function clientStatus(): int
    {
        return match (true) {
            $this->upstreamStatus === 429 => 503,
            $this->upstreamStatus >= 500 => 503,
            default => 502,
        };
    }
}
