import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type TableTest = {
  name: string;
  status: 'loading' | 'ok' | 'error';
  count?: number;
  error?: string;
};

const DebugRLS = () => {
  const [tests, setTests] = useState<TableTest[]>([
    { name: 'offers_packages', status: 'loading' },
    { name: 'offers_package_items', status: 'loading' },
    { name: 'offers_product_groups', status: 'loading' },
    { name: 'offers_products', status: 'loading' },
    { name: 'offers_package_parameter_links', status: 'loading' },
    { name: 'offers_package_parameter_definitions', status: 'loading' },
    { name: 'offers_products_prices', status: 'loading' },
    { name: 'offers_rates', status: 'loading' },
    { name: 'locs', status: 'loading' },
  ]);

  useEffect(() => {
    const testTable = async (tableName: string) => {
      try {
        const { data, error, count } = await (supabase as any)
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          setTests((prev) =>
            prev.map((t) =>
              t.name === tableName
                ? {
                    name: tableName,
                    status: 'error',
                    error: `${error.message} (Code: ${error.code || 'N/A'})`,
                  }
                : t
            )
          );
        } else {
          setTests((prev) =>
            prev.map((t) =>
              t.name === tableName
                ? { name: tableName, status: 'ok', count: count || 0 }
                : t
            )
          );
        }
      } catch (err: any) {
        setTests((prev) =>
          prev.map((t) =>
            t.name === tableName
              ? {
                  name: tableName,
                  status: 'error',
                  error: err.message || 'Unknown error',
                }
              : t
          )
        );
      }
    };

    tests.forEach((test) => testTable(test.name));
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>RLS Diagnostics</CardTitle>
            <CardDescription>
              Testing table access with current session (unauthenticated test page)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tests.map((test) => (
              <div
                key={test.name}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {test.status === 'loading' && (
                    <AlertCircle className="h-5 w-5 text-muted-foreground animate-pulse" />
                  )}
                  {test.status === 'ok' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {test.status === 'error' && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    {test.status === 'ok' && (
                      <div className="text-sm text-muted-foreground">
                        Row count: {test.count}
                      </div>
                    )}
                    {test.status === 'error' && (
                      <div className="text-sm text-destructive">{test.error}</div>
                    )}
                    {test.status === 'loading' && (
                      <div className="text-sm text-muted-foreground">Testing...</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugRLS;
