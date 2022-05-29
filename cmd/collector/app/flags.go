// Copyright (c) 2019 The Jaeger Authors.
// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package app

import (
	"flag"
	"fmt"
	"time"

	"github.com/spf13/viper"

	"github.com/jaegertracing/jaeger/cmd/flags"
	"github.com/jaegertracing/jaeger/pkg/config/tlscfg"
	"github.com/jaegertracing/jaeger/ports"
)

const (
	collectorDynQueueSizeMemory          = "collector.queue-size-memory"
	collectorGRPCHostPort                = "collector.grpc-server.host-port"
	collectorHTTPHostPort                = "collector.http-server.host-port"
	collectorNumWorkers                  = "collector.num-workers"
	collectorQueueSize                   = "collector.queue-size"
	collectorTags                        = "collector.tags"
	collectorZipkinAllowedHeaders        = "collector.zipkin.allowed-headers"
	collectorZipkinAllowedOrigins        = "collector.zipkin.allowed-origins"
	collectorZipkinHTTPHostPort          = "collector.zipkin.host-port"
	collectorGRPCMaxReceiveMessageLength = "collector.grpc-server.max-message-size"
	collectorMaxConnectionAge            = "collector.grpc-server.max-connection-age"
	collectorMaxConnectionAgeGrace       = "collector.grpc-server.max-connection-age-grace"
)

var tlsGRPCFlagsConfig = tlscfg.ServerFlagsConfig{
	Prefix: "collector.grpc",
}

var tlsHTTPFlagsConfig = tlscfg.ServerFlagsConfig{
	Prefix: "collector.http",
}

var tlsZipkinFlagsConfig = tlscfg.ServerFlagsConfig{
	Prefix: "collector.zipkin",
}

// CollectorOptions holds configuration for collector
type CollectorOptions struct {
	// DynQueueSizeMemory determines how much memory to use for the queue
	DynQueueSizeMemory uint
	// QueueSize is the size of collector's queue
	QueueSize int
	// NumWorkers is the number of internal workers in a collector
	NumWorkers int
	// HTTP section defines options for HTTP server
	HTTP struct {
		// HostPort is the host:port address that the collector service listens in on for http requests
		HostPort string
		// TLS configures secure transport for HTTP endpoint to collect spans
		TLS tlscfg.Options
	}
	// GRPC section defines options for gRPC server
	GRPC struct {
		// HostPort is the host:port address that the collector service listens in on for gRPC requests
		HostPort string
		// TLS configures secure transport for gRPC endpoint to collect spans
		TLS tlscfg.Options
		// MaxReceiveMessageLength is the maximum message size receivable by the gRPC Collector.
		MaxReceiveMessageLength int
		// MaxConnectionAge is a duration for the maximum amount of time a connection may exist.
		// See gRPC's keepalive.ServerParameters#MaxConnectionAge.
		MaxConnectionAge time.Duration
		// MaxConnectionAgeGrace is an additive period after MaxConnectionAge after which the connection will be forcibly closed.
		// See gRPC's keepalive.ServerParameters#MaxConnectionAgeGrace.
		MaxConnectionAgeGrace time.Duration
	}
	// OTLP section defines options for servers accepting OpenTelemetry OTLP format
	OTLP struct {
		GRPCHostPort string
		HTTPHostPort string
	}
	// Zipkin section defines options for Zipkin HTTP server
	Zipkin struct {
		// HTTPHostPort is the host:port address that the Zipkin collector service listens in on for http requests
		HTTPHostPort string
		// ZipkinAllowedOrigins is a list of origins a cross-domain request to the Zipkin collector service can be executed from
		AllowedOrigins string
		// ZipkinAllowedHeaders is a list of headers that the Zipkin collector service allowes the client to use with cross-domain requests
		AllowedHeaders string
		// TLS configures secure transport for Zipkin endpoint to collect spans
		TLS tlscfg.Options
	}
	// CollectorTags is the string representing collector tags to append to each and every span
	CollectorTags map[string]string
}

// AddFlags adds flags for CollectorOptions
func AddFlags(flags *flag.FlagSet) {
	flags.Int(collectorNumWorkers, DefaultNumWorkers, "The number of workers pulling items from the queue")
	flags.Int(collectorQueueSize, DefaultQueueSize, "The queue size of the collector")
	flags.Int(collectorGRPCMaxReceiveMessageLength, DefaultGRPCMaxReceiveMessageLength, "The maximum receivable message size for the collector's GRPC server")
	flags.String(collectorGRPCHostPort, ports.PortToHostPort(ports.CollectorGRPC), "The host:port (e.g. 127.0.0.1:14250 or :14250) of the collector's GRPC server")
	flags.String(collectorHTTPHostPort, ports.PortToHostPort(ports.CollectorHTTP), "The host:port (e.g. 127.0.0.1:14268 or :14268) of the collector's HTTP server")
	flags.String(collectorTags, "", "One or more tags to be added to the Process tags of all spans passing through this collector. Ex: key1=value1,key2=${envVar:defaultValue}")
	flags.String(collectorZipkinAllowedHeaders, "content-type", "Comma separated list of allowed headers for the Zipkin collector service, default content-type")
	flags.String(collectorZipkinAllowedOrigins, "*", "Comma separated list of allowed origins for the Zipkin collector service, default accepts all")
	flags.String(collectorZipkinHTTPHostPort, "", "The host:port (e.g. 127.0.0.1:9411 or :9411) of the collector's Zipkin server (disabled by default)")
	flags.Uint(collectorDynQueueSizeMemory, 0, "(experimental) The max memory size in MiB to use for the dynamic queue.")
	flags.Duration(collectorMaxConnectionAge, 0, "The maximum amount of time a connection may exist. Set this value to a few seconds or minutes on highly elastic environments, so that clients discover new collector nodes frequently. See https://pkg.go.dev/google.golang.org/grpc/keepalive#ServerParameters")
	flags.Duration(collectorMaxConnectionAgeGrace, 0, "The additive period after MaxConnectionAge after which the connection will be forcibly closed. See https://pkg.go.dev/google.golang.org/grpc/keepalive#ServerParameters")

	tlsGRPCFlagsConfig.AddFlags(flags)
	tlsHTTPFlagsConfig.AddFlags(flags)
	tlsZipkinFlagsConfig.AddFlags(flags)
}

// InitFromViper initializes CollectorOptions with properties from viper
func (cOpts *CollectorOptions) InitFromViper(v *viper.Viper) (*CollectorOptions, error) {
	cOpts.GRPC.HostPort = ports.FormatHostPort(v.GetString(collectorGRPCHostPort))
	cOpts.GRPC.MaxReceiveMessageLength = v.GetInt(collectorGRPCMaxReceiveMessageLength)
	cOpts.GRPC.MaxConnectionAge = v.GetDuration(collectorMaxConnectionAge)
	cOpts.GRPC.MaxConnectionAgeGrace = v.GetDuration(collectorMaxConnectionAgeGrace)
	if tlsGrpc, err := tlsGRPCFlagsConfig.InitFromViper(v); err == nil {
		cOpts.GRPC.TLS = tlsGrpc
	} else {
		return cOpts, fmt.Errorf("failed to parse gRPC TLS options: %w", err)
	}
	cOpts.HTTP.HostPort = ports.FormatHostPort(v.GetString(collectorHTTPHostPort))
	if tlsHTTP, err := tlsHTTPFlagsConfig.InitFromViper(v); err == nil {
		cOpts.HTTP.TLS = tlsHTTP
	} else {
		return cOpts, fmt.Errorf("failed to parse HTTP TLS options: %w", err)
	}
	cOpts.Zipkin.AllowedHeaders = v.GetString(collectorZipkinAllowedHeaders)
	cOpts.Zipkin.AllowedOrigins = v.GetString(collectorZipkinAllowedOrigins)
	cOpts.Zipkin.HTTPHostPort = ports.FormatHostPort(v.GetString(collectorZipkinHTTPHostPort))
	if tlsZipkin, err := tlsZipkinFlagsConfig.InitFromViper(v); err == nil {
		cOpts.Zipkin.TLS = tlsZipkin
	} else {
		return cOpts, fmt.Errorf("failed to parse Zipkin TLS options: %w", err)
	}
	cOpts.CollectorTags = flags.ParseJaegerTags(v.GetString(collectorTags))
	cOpts.DynQueueSizeMemory = v.GetUint(collectorDynQueueSizeMemory) * 1024 * 1024 // we receive in MiB and store in bytes
	cOpts.NumWorkers = v.GetInt(collectorNumWorkers)
	cOpts.QueueSize = v.GetInt(collectorQueueSize)

	return cOpts, nil
}
