import type { FC } from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryService } from "@/services/categoryService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { PlusIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { confirmReactivate, showSuccessAlert } from "@/lib/alerts";
import { areCatalogNamesSimilar, normalizeUniqueName } from "@/lib/utils";
import toast from "react-hot-toast";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre de la categoría es obligatorio.")
    .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, "El nombre debe contener al menos una letra."),
});
type FormData = z.infer<typeof schema>;

export const CategoriesPage: FC = () => {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoryService.getAll,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) => categoryService.create(d.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      showSuccessAlert("Categoría registrada correctamente");
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reactivateMut = useMutation({
    mutationFn: (id: string) => categoryService.reactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      showSuccessAlert("Categoría activada correctamente");
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      categoryService.update(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      showSuccessAlert("Categoría actualizada correctamente");
      closeModal();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: (id: string) => categoryService.toggleActive(id),
    onSuccess: (category) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      showSuccessAlert(category.isActive ? "Categoría activada correctamente" : "Categoría desactivada correctamente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    reset({ name: "" });
    setEditingId(null);
    setIsOpen(true);
  };
  const openEdit = (id: string, name: string) => {
    reset({ name });
    setEditingId(id);
    setIsOpen(true);
  };
  const closeModal = () => {
    setIsOpen(false);
    setEditingId(null);
    reset({ name: "" });
  };

  const onSubmit = async (data: FormData) => {
    if (editingId) {
      updateMut.mutate({ id: editingId, name: data.name });
      return;
    }

    try {
      const allCategories = await categoryService.getAllIncludingInactive();
      const duplicateActive = allCategories.some(
        (category) => category.isActive && normalizeUniqueName(category.name) === normalizeUniqueName(data.name),
      );
      if (duplicateActive) {
        toast.error("Esta categoría ya está registrada");
        return;
      }

      const inactiveCategory = allCategories.find(
        (category) => !category.isActive && areCatalogNamesSimilar(category.name, data.name),
      );
      if (inactiveCategory) {
        if (await confirmReactivate("categoría", inactiveCategory.name)) {
          reactivateMut.mutate(inactiveCategory.id);
        }
        return;
      }
      createMut.mutate(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo verificar la categoría");
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorías</h1>
        <Button onClick={openCreate} size="sm">
          <PlusIcon className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-140 w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Estado
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? "success" : "default"}>
                      {c.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(c.id, c.name)}
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMut.mutate(c.id)}
                    >
                      {c.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={editingId ? "Editar categoría" : "Nueva categoría"}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Nombre de la categoría"
            placeholder="Ej. Postres"
            {...register("name")}
            error={errors.name?.message}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMut.isPending || reactivateMut.isPending}>
              {editingId ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
