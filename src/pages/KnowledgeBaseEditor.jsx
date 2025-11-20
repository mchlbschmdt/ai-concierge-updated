import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SwipeableTabs, TabsContent } from '@/components/ui/swipeable-tabs';
import SwipeIndicator from '@/components/ui/SwipeIndicator';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Plus, Trash2, FileText, Eye } from 'lucide-react';

const KnowledgeBaseEditor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState(null);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  
  // Structured sections state
  const [propertyDetails, setPropertyDetails] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [houseRules, setHouseRules] = useState('');
  const [checkoutInstructions, setCheckoutInstructions] = useState('');
  const [resortAmenities, setResortAmenities] = useState('');
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    loadPropertyData();
  }, []);

  const loadPropertyData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('code', '1434')
        .single();

      if (error) throw error;
      
      setProperty(data);
      parseKnowledgeBase(data.knowledge_base || '');
    } catch (error) {
      console.error('Error loading property:', error);
      toast({
        title: "Error",
        description: "Failed to load property data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const parseKnowledgeBase = (knowledgeBase) => {
    // Parse the knowledge base text into structured sections
    const sections = {
      propertyDetails: '',
      amenities: [],
      houseRules: '',
      checkoutInstructions: '',
      resortAmenities: '',
      faqs: []
    };

    // Split by major sections
    const detailsMatch = knowledgeBase.match(/# PROPERTY DETAILS\n([\s\S]*?)(?=\n# |$)/);
    if (detailsMatch) sections.propertyDetails = detailsMatch[1].trim();

    const amenitiesMatch = knowledgeBase.match(/# AMENITIES & FACILITIES\n([\s\S]*?)(?=\n# |$)/);
    if (amenitiesMatch) {
      const amenityText = amenitiesMatch[1].trim();
      sections.amenities = amenityText.split('\n\n').map(block => {
        const lines = block.split('\n');
        return {
          id: Date.now() + Math.random(),
          title: lines[0].replace(/^[*-]\s*/, '').replace(/:$/, ''),
          description: lines.slice(1).join('\n').trim()
        };
      });
    }

    const rulesMatch = knowledgeBase.match(/# HOUSE RULES\n([\s\S]*?)(?=\n# |$)/);
    if (rulesMatch) sections.houseRules = rulesMatch[1].trim();

    const checkoutMatch = knowledgeBase.match(/# CHECKOUT INSTRUCTIONS\n([\s\S]*?)(?=\n# |$)/);
    if (checkoutMatch) sections.checkoutInstructions = checkoutMatch[1].trim();

    const resortMatch = knowledgeBase.match(/# ADDITIONAL SERVICES[\s\S]*?SOLARA RESORT AMENITIES[^:]*:\n([\s\S]*?)(?=\n# |$)/);
    if (resortMatch) sections.resortAmenities = resortMatch[1].trim();

    const faqMatch = knowledgeBase.match(/# FREQUENTLY ASKED QUESTIONS\n([\s\S]*?)(?=\n# |$)/);
    if (faqMatch) {
      const faqText = faqMatch[1].trim();
      const faqBlocks = faqText.split(/\n(?=Q:)/);
      sections.faqs = faqBlocks.map(block => {
        const qMatch = block.match(/Q:\s*(.*?)(?=\nA:)/s);
        const aMatch = block.match(/A:\s*(.*?)$/s);
        return {
          id: Date.now() + Math.random(),
          question: qMatch ? qMatch[1].trim() : '',
          answer: aMatch ? aMatch[1].trim() : ''
        };
      }).filter(faq => faq.question && faq.answer);
    }

    setPropertyDetails(sections.propertyDetails);
    setAmenities(sections.amenities);
    setHouseRules(sections.houseRules);
    setCheckoutInstructions(sections.checkoutInstructions);
    setResortAmenities(sections.resortAmenities);
    setFaqs(sections.faqs);
  };

  const buildKnowledgeBase = () => {
    let kb = '';

    // Property Details
    if (propertyDetails) {
      kb += '# PROPERTY DETAILS\n' + propertyDetails + '\n\n';
    }

    // Amenities
    if (amenities.length > 0) {
      kb += '# AMENITIES & FACILITIES\n\n';
      amenities.forEach(amenity => {
        kb += `${amenity.title}:\n${amenity.description}\n\n`;
      });
    }

    // House Rules
    if (houseRules) {
      kb += '# HOUSE RULES\n' + houseRules + '\n\n';
    }

    // Checkout Instructions
    if (checkoutInstructions) {
      kb += '# CHECKOUT INSTRUCTIONS\n' + checkoutInstructions + '\n\n';
    }

    // Resort Amenities
    if (resortAmenities) {
      kb += '# ADDITIONAL SERVICES\n\nSOLARA RESORT AMENITIES (Complimentary Access):\n' + resortAmenities + '\n\n';
    }

    // FAQs
    if (faqs.length > 0) {
      kb += '# FREQUENTLY ASKED QUESTIONS\n\n';
      faqs.forEach(faq => {
        kb += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
      });
    }

    return kb.trim();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const knowledgeBase = buildKnowledgeBase();
      
      const { error } = await supabase
        .from('properties')
        .update({ knowledge_base: knowledgeBase, updated_at: new Date().toISOString() })
        .eq('code', '1434');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Knowledge base updated successfully"
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Error",
        description: "Failed to save knowledge base",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addAmenity = () => {
    setAmenities([...amenities, { id: Date.now(), title: '', description: '' }]);
  };

  const updateAmenity = (id, field, value) => {
    setAmenities(amenities.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const deleteAmenity = (id) => {
    setAmenities(amenities.filter(a => a.id !== id));
  };

  const addFaq = () => {
    setFaqs([...faqs, { id: Date.now(), question: '', answer: '' }]);
  };

  const updateFaq = (id, field, value) => {
    setFaqs(faqs.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const deleteFaq = (id) => {
    setFaqs(faqs.filter(f => f.id !== id));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Property 1434 not found</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Knowledge Base Editor</h1>
            <p className="text-muted-foreground mt-2">
              Property 1434 - {property.property_name}
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <SwipeableTabs 
          defaultValue="details" 
          tabs={[
            { value: 'details', label: 'Details' },
            { value: 'amenities', label: 'Amenities' },
            { value: 'rules', label: 'House Rules' },
            { value: 'checkout', label: 'Checkout' },
            { value: 'resort', label: 'Resort' },
            { value: 'faq', label: 'FAQs' },
            { value: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" /> }
          ]}
          className="w-full"
        >

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
                <CardDescription>
                  General property information and welcome message
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={propertyDetails}
                  onChange={(e) => setPropertyDetails(e.target.value)}
                  placeholder="Enter property details..."
                  className="min-h-[300px]"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="amenities">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Amenities & Facilities</CardTitle>
                    <CardDescription>
                      Detailed information about property amenities
                    </CardDescription>
                  </div>
                  <Button onClick={addAmenity} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Amenity
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {amenities.map((amenity) => (
                  <div key={amenity.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={amenity.title}
                        onChange={(e) => updateAmenity(amenity.id, 'title', e.target.value)}
                        placeholder="Amenity title (e.g., HOT TUB, POOL)"
                        className="flex-1 mr-2"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteAmenity(amenity.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={amenity.description}
                      onChange={(e) => updateAmenity(amenity.id, 'description', e.target.value)}
                      placeholder="Amenity details and instructions..."
                      className="min-h-[100px]"
                    />
                  </div>
                ))}
                {amenities.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No amenities added yet. Click "Add Amenity" to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>House Rules</CardTitle>
                <CardDescription>
                  Property rules and guest guidelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  placeholder="Enter house rules..."
                  className="min-h-[300px]"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkout">
            <Card>
              <CardHeader>
                <CardTitle>Checkout Instructions</CardTitle>
                <CardDescription>
                  Step-by-step checkout procedures for guests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={checkoutInstructions}
                  onChange={(e) => setCheckoutInstructions(e.target.value)}
                  placeholder="Enter checkout instructions..."
                  className="min-h-[300px]"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resort">
            <Card>
              <CardHeader>
                <CardTitle>Resort Amenities</CardTitle>
                <CardDescription>
                  Solara Resort amenities and access information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={resortAmenities}
                  onChange={(e) => setResortAmenities(e.target.value)}
                  placeholder="Enter resort amenities..."
                  className="min-h-[300px]"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>
                      Common guest questions and answers
                    </CardDescription>
                  </div>
                  <Button onClick={addFaq} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add FAQ
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Question</label>
                          <Input
                            value={faq.question}
                            onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                            placeholder="Enter question..."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Answer</label>
                          <Textarea
                            value={faq.answer}
                            onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                            placeholder="Enter answer..."
                            className="min-h-[80px]"
                          />
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="ml-2"
                        onClick={() => deleteFaq(faq.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {faqs.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No FAQs added yet. Click "Add FAQ" to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Guest View Preview</CardTitle>
                <CardDescription>
                  How the knowledge base will appear to guests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {propertyDetails && (
                  <div className="prose prose-sm max-w-none">
                    <h2 className="text-xl font-bold mb-3">Property Details</h2>
                    <div className="whitespace-pre-wrap text-muted-foreground">
                      {propertyDetails}
                    </div>
                  </div>
                )}

                {amenities.length > 0 && (
                  <div className="prose prose-sm max-w-none">
                    <h2 className="text-xl font-bold mb-3">Amenities & Facilities</h2>
                    <div className="grid gap-4">
                      {amenities.map((amenity) => (
                        <div key={amenity.id} className="border-l-4 border-primary pl-4">
                          <h3 className="font-semibold text-lg mb-2">{amenity.title}</h3>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {amenity.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {houseRules && (
                  <div className="prose prose-sm max-w-none">
                    <h2 className="text-xl font-bold mb-3">House Rules</h2>
                    <div className="whitespace-pre-wrap text-muted-foreground">
                      {houseRules}
                    </div>
                  </div>
                )}

                {checkoutInstructions && (
                  <div className="prose prose-sm max-w-none">
                    <h2 className="text-xl font-bold mb-3">Checkout Instructions</h2>
                    <div className="whitespace-pre-wrap text-muted-foreground">
                      {checkoutInstructions}
                    </div>
                  </div>
                )}

                {resortAmenities && (
                  <div className="prose prose-sm max-w-none">
                    <h2 className="text-xl font-bold mb-3">Solara Resort Amenities</h2>
                    <div className="whitespace-pre-wrap text-muted-foreground">
                      {resortAmenities}
                    </div>
                  </div>
                )}

                {faqs.length > 0 && (
                  <div className="prose prose-sm max-w-none">
                    <h2 className="text-xl font-bold mb-3">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                      {faqs.map((faq) => (
                        <div key={faq.id} className="bg-muted/50 rounded-lg p-4">
                          <h3 className="font-semibold mb-2">Q: {faq.question}</h3>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            A: {faq.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!propertyDetails && amenities.length === 0 && !houseRules && 
                 !checkoutInstructions && !resortAmenities && faqs.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No content to preview. Add content in the other tabs to see the preview.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </SwipeableTabs>

        <SwipeIndicator show={showSwipeHint} onDismiss={() => setShowSwipeHint(false)} />
      </div>
    </Layout>
  );
};

export default KnowledgeBaseEditor;
