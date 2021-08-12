// Copyright (c) 2021 The Jaeger Authors.
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
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const esIndexResponse = `
{
  "jaeger-service-2021-08-06" : {
    "aliases" : { },
    "settings" : {
      "index.creation_date" : "1628259381266",
      "index.mapper.dynamic" : "false",
      "index.mapping.nested_fields.limit" : "50",
      "index.number_of_replicas" : "1",
      "index.number_of_shards" : "5",
      "index.provided_name" : "jaeger-service-2021-08-06",
      "index.requests.cache.enable" : "true",
      "index.uuid" : "2kKdvrvAT7qXetRzmWhjYQ",
      "index.version.created" : "5061099"
    }
  },
  "jaeger-span-2021-08-06" : {
    "aliases" : { },
    "settings" : {
      "index.creation_date" : "1628259381326",
      "index.mapper.dynamic" : "false",
      "index.mapping.nested_fields.limit" : "50",
      "index.number_of_replicas" : "1",
      "index.number_of_shards" : "5",
      "index.provided_name" : "jaeger-span-2021-08-06",
      "index.requests.cache.enable" : "true",
      "index.uuid" : "zySRY_FfRFa5YMWxNsNViA",
      "index.version.created" : "5061099"
    }
  },
 "jaeger-span-000001" : {
    "aliases" : {
      "jaeger-span-read" : { },
      "jaeger-span-write" : { }
    },
    "settings" : {
      "index.creation_date" : "1628259381326"
    }
  }
}`

const esErrResponse = `{"error":{"root_cause":[{"type":"illegal_argument_exception","reason":"request [/jaeger-*] contains unrecognized parameter: [help]"}],"type":"illegal_argument_exception","reason":"request [/jaeger-*] contains unrecognized parameter: [help]"},"status":400}`

func TestClientGetIndices(t *testing.T) {
	tests := []struct {
		name         string
		responseCode int
		response     string
		errContains  string
		indices      []Index
	}{
		{
			name:         "no error",
			responseCode: http.StatusOK,
			response:     esIndexResponse,
			indices: []Index{
				{
					Index:        "jaeger-service-2021-08-06",
					CreationTime: time.Unix(0, int64(time.Millisecond)*1628259381266),
					Aliases:      map[string]bool{},
				},
				{
					Index:        "jaeger-span-000001",
					CreationTime: time.Unix(0, int64(time.Millisecond)*1628259381326),
					Aliases:      map[string]bool{"jaeger-span-read": true, "jaeger-span-write": true},
				},
				{
					Index:        "jaeger-span-2021-08-06",
					CreationTime: time.Unix(0, int64(time.Millisecond)*1628259381326),
					Aliases:      map[string]bool{},
				},
			},
		},
		{
			name:         "client error",
			responseCode: http.StatusBadRequest,
			response:     esErrResponse,
			errContains:  "failed to query indices: request failed, status code: 400",
		},
		{
			name:         "unmarshall error",
			responseCode: http.StatusOK,
			response:     "AAA",
			errContains:  `failed to query indices and unmarshall response body: "AAA"`,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			testServer := httptest.NewServer(http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
				res.WriteHeader(test.responseCode)
				res.Write([]byte(test.response))
			}))
			defer testServer.Close()

			c := &IndicesClient{
				Client:   testServer.Client(),
				Endpoint: testServer.URL,
			}

			indices, err := c.GetJaegerIndices("")
			if test.errContains != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), test.errContains)
				assert.Nil(t, indices)
			} else {
				require.NoError(t, err)
				sort.Slice(indices, func(i, j int) bool {
					return strings.Compare(indices[i].Index, indices[j].Index) < 0
				})
				assert.Equal(t, test.indices, indices)
			}
		})
	}
}

func TestClientDeleteIndices(t *testing.T) {
	tests := []struct {
		name         string
		responseCode int
		response     string
		errContains  string
	}{
		{
			name:         "no error",
			responseCode: http.StatusOK,
		},
		{
			name:         "client error",
			responseCode: http.StatusBadRequest,
			response:     esErrResponse,
			errContains:  "ailed to delete indices: jaeger-span",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {

			testServer := httptest.NewServer(http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
				assert.True(t, strings.Contains(req.URL.String(), "jaeger-span"))
				assert.Equal(t, "Basic foobar", req.Header.Get("Authorization"))
				res.WriteHeader(test.responseCode)
				res.Write([]byte(test.response))
			}))
			defer testServer.Close()

			c := &IndicesClient{
				Client:    testServer.Client(),
				Endpoint:  testServer.URL,
				BasicAuth: "foobar",
			}

			err := c.DeleteIndices([]Index{
				{
					Index: "jaeger-span",
				},
			})

			if test.errContains != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), test.errContains)
			}
		})
	}
}

func TestClientRequestError(t *testing.T) {
	c := &IndicesClient{
		Endpoint: "%",
	}
	err := c.DeleteIndices([]Index{})
	require.Error(t, err)
	indices, err := c.GetJaegerIndices("")
	require.Error(t, err)
	assert.Nil(t, indices)
}

func TestClientDoError(t *testing.T) {
	c := &IndicesClient{
		Endpoint: "localhost:1",
		Client:   &http.Client{},
	}
	err := c.DeleteIndices([]Index{})
	require.Error(t, err)
	indices, err := c.GetJaegerIndices("")
	require.Error(t, err)
	assert.Nil(t, indices)
}
