import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const analysisSchema = z.object({
  fundName: z.string().min(2).max(100).optional(),
  sectors: z.string().min(2),
  stage: z.enum(['pre-seed', 'seed', 'series-a', 'series-b']),
  geography: z.string().min(2),
  numberOfStartups: z.number().int().min(1).max(10).default(5),
});

type AnalysisFormData = z.infer<typeof analysisSchema>;

interface AnalysisFormProps {
  onSubmit: (data: AnalysisFormData) => void;
  isLoading?: boolean;
}

export function AnalysisForm({ onSubmit, isLoading }: AnalysisFormProps) {
  const form = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      numberOfStartups: 5,
      stage: 'seed',
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Fund Name (optional) */}
            <FormField
              control={form.control}
              name="fundName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Name (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Sequoia Capital, Accel Partners"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank for custom thesis instead
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Sectors */}
            <FormField
              control={form.control}
              name="sectors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sectors *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., AI, FinTech, BioTech"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Stage */}
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment Stage *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="series-b">Series B</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Geography */}
            <FormField
              control={form.control}
              name="geography"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geography *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., France, Europe, Global"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Number of Startups */}
            <FormField
              control={form.control}
              name="numberOfStartups"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Startups to Find</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>1-10 startups (default: 5)</FormDescription>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Analyzing...' : 'Start Analysis'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
