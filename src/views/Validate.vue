<template>
  <v-main>
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center flex-wrap ga-2">
              <span class="text-h5">Config &amp; Data Validation</span>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                prepend-icon="mdi-refresh"
                :loading="running"
                :disabled="running"
                @click="run"
              >
                Re-run
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-alert type="info" variant="tonal" class="mb-4">
                Checks JSON under <code>public/config</code> and every indicator
                Google Sheet CSV for schema, types, and impossible values.
              </v-alert>

              <div v-if="running" class="d-flex align-center ga-3 mb-4">
                <v-progress-circular indeterminate color="primary" size="28" />
                <span>Validating configs and sheets…</span>
              </div>

              <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
                {{ error }}
              </v-alert>

              <template v-if="summary && !running">
                <div class="d-flex flex-wrap ga-2 mb-4">
                  <v-chip color="success" variant="flat">
                    {{ summary.filesPassed }} passed
                  </v-chip>
                  <v-chip
                    :color="summary.filesFailed ? 'error' : 'success'"
                    variant="flat"
                  >
                    {{ summary.filesFailed }} failed
                  </v-chip>
                  <v-chip
                    :color="summary.warnCount ? 'warning' : 'default'"
                    variant="tonal"
                  >
                    {{ summary.warnCount }} warnings
                  </v-chip>
                  <v-chip
                    :color="summary.failCount ? 'error' : 'default'"
                    variant="tonal"
                  >
                    {{ summary.failCount }} fail issues
                  </v-chip>
                </div>

                <v-expansion-panels multiple>
                  <v-expansion-panel
                    v-for="file in summary.files"
                    :key="file.filename"
                  >
                    <v-expansion-panel-title>
                      <div class="d-flex align-center flex-wrap ga-2 w-100 pr-4">
                        <strong>{{ file.filename }}</strong>
                        <v-chip
                          size="small"
                          :color="file.status === 'pass' ? 'success' : 'error'"
                          variant="flat"
                        >
                          {{ file.status === 'pass' ? 'PASS' : 'FAIL' }}
                        </v-chip>
                        <span class="text-medium-emphasis text-caption">
                          {{ fileIssueSummary(file) }}
                        </span>
                      </div>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <div v-if="!file.issues.length && !file.sheets.length" class="text-success">
                        No issues found.
                      </div>

                      <template v-if="file.issues.length">
                        <div class="text-subtitle-2 mb-2">Config issues</div>
                        <v-list density="compact" class="mb-4 bg-transparent">
                          <v-list-item
                            v-for="(issue, idx) in file.issues"
                            :key="'cfg-' + idx"
                            :subtitle="formatLocation(issue)"
                          >
                            <template #prepend>
                              <v-icon
                                :color="issue.severity === 'fail' ? 'error' : 'warning'"
                                size="small"
                                class="mr-2"
                              >
                                {{
                                  issue.severity === 'fail'
                                    ? 'mdi-close-circle'
                                    : 'mdi-alert'
                                }}
                              </v-icon>
                            </template>
                            <v-list-item-title class="text-wrap">
                              <strong class="text-uppercase text-caption mr-1">
                                {{ issue.severity }}
                              </strong>
                              {{ issue.message }}
                            </v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </template>

                      <template v-if="file.sheets.length">
                        <div class="text-subtitle-2 mb-2">Sheet data</div>
                        <v-expansion-panels multiple variant="accordion">
                          <v-expansion-panel
                            v-for="sheet in file.sheets"
                            :key="sheet.label + sheet.url"
                          >
                            <v-expansion-panel-title>
                              <div class="d-flex align-center flex-wrap ga-2">
                                <span>{{ sheet.label }}</span>
                                <v-chip
                                  size="x-small"
                                  :color="
                                    sheet.status === 'pass' ? 'success' : 'error'
                                  "
                                  variant="flat"
                                >
                                  {{ sheet.status === 'pass' ? 'PASS' : 'FAIL' }}
                                </v-chip>
                                <span
                                  v-if="sheet.issues.length"
                                  class="text-caption text-medium-emphasis"
                                >
                                  {{ sheet.issues.length }} issue(s)
                                </span>
                              </div>
                            </v-expansion-panel-title>
                            <v-expansion-panel-text>
                              <div class="text-caption mb-2 text-break">
                                <a :href="sheet.url" target="_blank" rel="noopener">
                                  {{ sheet.url }}
                                </a>
                              </div>
                              <div
                                v-if="!sheet.issues.length"
                                class="text-success"
                              >
                                No issues found.
                              </div>
                              <v-list
                                v-else
                                density="compact"
                                class="bg-transparent"
                              >
                                <v-list-item
                                  v-for="(issue, idx) in sheet.issues"
                                  :key="'sh-' + idx"
                                  :subtitle="formatLocation(issue)"
                                >
                                  <template #prepend>
                                    <v-icon
                                      :color="
                                        issue.severity === 'fail'
                                          ? 'error'
                                          : 'warning'
                                      "
                                      size="small"
                                      class="mr-2"
                                    >
                                      {{
                                        issue.severity === 'fail'
                                          ? 'mdi-close-circle'
                                          : 'mdi-alert'
                                      }}
                                    </v-icon>
                                  </template>
                                  <v-list-item-title class="text-wrap">
                                    <strong class="text-uppercase text-caption mr-1">
                                      {{ issue.severity }}
                                    </strong>
                                    {{ issue.message }}
                                  </v-list-item-title>
                                </v-list-item>
                              </v-list>
                            </v-expansion-panel-text>
                          </v-expansion-panel>
                        </v-expansion-panels>
                      </template>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </template>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<script setup lang="ts">
import { inject, onMounted, ref } from 'vue';
import {
  runValidation,
  type ConfigFileValidationResult,
  type ValidationIssue,
  type ValidationRunSummary,
} from '../utils/validation';

const sitePath = inject<string>('sitePath', '');
const running = ref(false);
const error = ref<string | null>(null);
const summary = ref<ValidationRunSummary | null>(null);

function formatLocation(issue: ValidationIssue): string {
  const parts: string[] = [];
  if (issue.path) parts.push(issue.path);
  if (issue.line != null) {
    parts.push(
      issue.column != null
        ? `line ${issue.line}, col ${issue.column}`
        : `line ${issue.line}`
    );
  }
  if (issue.row != null) parts.push(`CSV row ${issue.row}`);
  if (issue.columnName) parts.push(`column ${issue.columnName}`);
  return parts.join(' · ');
}

function fileIssueSummary(file: ConfigFileValidationResult): string {
  const configFails = file.issues.filter((i) => i.severity === 'fail').length;
  const configWarns = file.issues.filter((i) => i.severity === 'warn').length;
  const sheetFails = file.sheets.filter((s) => s.status === 'fail').length;
  const sheetPass = file.sheets.filter((s) => s.status === 'pass').length;
  const bits: string[] = [];
  if (file.sheets.length) {
    bits.push(`${sheetPass}/${file.sheets.length} sheets ok`);
  }
  if (configFails) bits.push(`${configFails} config fail(s)`);
  if (configWarns) bits.push(`${configWarns} config warn(s)`);
  if (sheetFails) bits.push(`${sheetFails} sheet(s) failed`);
  return bits.join(' · ') || 'clean';
}

async function run() {
  running.value = true;
  error.value = null;
  try {
    summary.value = await runValidation(sitePath);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    summary.value = null;
  } finally {
    running.value = false;
  }
}

onMounted(() => {
  void run();
});
</script>
